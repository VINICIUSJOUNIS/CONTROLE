import { prisma } from "@/lib/prisma";
import { BudgetGroup, BudgetScenario } from "@/generated/prisma/client";
import { ALIQ_CBS_2027, ALIQ_IBS_2027, ehDespesaCreditavel, BUDGET_GROUP_ORDER, BUDGET_GROUP_LABELS } from "@/lib/budget-constants";
import { getSales, getSaleReturns } from "@/lib/data";
import { addMonths, somaJanela, sazonalidade, type HistoricoMes } from "@/lib/budget-projecao";

function n(value: unknown): number {
  return Number(value);
}

// Grupos tratados como custo variavel (escalam com a receita) e fixo (nao
// escalam) para o calculo do Ponto de Equilibrio. Investimentos fica de fora
// - e capex, nao custo operacional recorrente.
const CUSTO_VARIAVEL_GROUPS: BudgetGroup[] = [
  "CUSTO_FORNECEDOR",
  "DESPESA_MERCADO_INTERNO",
  "DESPESA_MERCADO_EXTERNO",
  "DESPESA_ADM_VARIAVEL",
  "IMPOSTOS",
];
const CUSTO_FIXO_GROUPS: BudgetGroup[] = ["DESPESA_ADM_FIXA", "DESPESA_PESSOAL", "FINANCIAMENTO"];

export type RegraImposto = "PIS" | "COFINS" | "IRPJ" | "CSLL" | "DARE" | "CREDITO_CBS_IBS" | "FERIAS" | "DECIMO_TERCEIRO" | "INSS_FOLHA" | "FGTS" | "ENCARGOS_13" | "ENCARGOS_FERIAS";
// Adicional de IRPJ: 10% sobre o lucro acima de R$ 240 mil/ano = R$ 20 mil/mes.
const IRPJ_ADICIONAL_MES = 20_000;

const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export async function getBudgetYears() {
  const plans = await prisma.budgetPlan.findMany({ select: { year: true }, orderBy: { year: "desc" } });
  return plans.map((p) => p.year);
}

// Multiplicador de crescimento do cenario selecionado sobre o volume base
// (Conservador = 1, sem crescimento). Chamado uma vez por mercado (interno e
// externo tem % proprios).
function scenarioMultiplier(plan: {
  scenario: BudgetScenario;
  crescimentoModerado: number;
  crescimentoOtimista: number;
  crescimentoMuitoOtimista: number;
}) {
  switch (plan.scenario) {
    case "MODERADO":
      return 1 + plan.crescimentoModerado;
    case "OTIMISTA":
      return 1 + plan.crescimentoOtimista;
    case "MUITO_OTIMISTA":
      return 1 + plan.crescimentoMuitoOtimista;
    default:
      return 1;
  }
}

// cenarioOverride: simula outro cenario so na leitura (botoes da pagina
// Orcamento), sem alterar o cenario salvo no plano.
export async function getBudgetPlan(year: number, cenarioOverride?: BudgetScenario) {
  const plan = await prisma.budgetPlan.findUnique({
    where: { year },
    include: {
      volumes: true,
      lines: { include: { months: true }, orderBy: [{ group: "asc" }, { orderIndex: "asc" }] },
    },
  });
  if (!plan) return null;

  const cotacaoSacaUsd = n(plan.cotacaoSacaUsd);
  const cotacaoDolar = n(plan.cotacaoDolar);
  const cenario: BudgetScenario =
    cenarioOverride && Object.values(BudgetScenario).includes(cenarioOverride) ? cenarioOverride : plan.scenario;
  const multInterno = scenarioMultiplier({
    scenario: cenario,
    crescimentoModerado: n(plan.crescimentoModerado),
    crescimentoOtimista: n(plan.crescimentoOtimista),
    crescimentoMuitoOtimista: n(plan.crescimentoMuitoOtimista),
  });
  const multExterno = scenarioMultiplier({
    scenario: cenario,
    crescimentoModerado: n(plan.crescimentoModeradoExterno),
    crescimentoOtimista: n(plan.crescimentoOtimistaExterno),
    crescimentoMuitoOtimista: n(plan.crescimentoMuitoOtimistaExterno),
  });

  const volumeByMonth = new Map(plan.volumes.map((v) => [v.month, v]));

  // Volume previsto do mes ja ajustado pelo cenario (mesma conta de `months`
  // abaixo), usado pelas linhas de custo por saca.
  const volumePrevistoMes = (m: number, base: string) => {
    // Arredondado como em `months` (2 casas), para o previsto bater com
    // valor por saca x sacas exibidas na tela.
    const v = volumeByMonth.get(m);
    const baseTotal = v ? n(v.volumeBaseSacas) : 0;
    const baseExterno = v ? n(v.volumeExternoSacas) : 0;
    const interno = Number(((baseTotal - baseExterno) * multInterno).toFixed(2));
    const externo = Number((baseExterno * multExterno).toFixed(2));
    if (base === "EXTERNO") return externo;
    if (base === "INTERNO") return interno;
    return Number((interno + externo).toFixed(2));
  };

  // Despesas digitadas (mes a mes e fixo mensal) tambem crescem com o cenario:
  // os valores gravados sao a base (Conservador) e o previsto exibido =
  // base x fator. Despesas do mercado interno/externo usam o % do proprio
  // mercado; os demais grupos, o crescimento do volume total do ano (media
  // ponderada pelo volume base de cada mercado). Por saca e % da receita ja
  // acompanham o volume do cenario e nao recebem fator. Tudo que e digitado
  // (mes a mes e fixo mensal) e o cenario Conservador; os demais cenarios
  // projetam pelo fator.
  let baseIntAno = 0;
  let baseExtAno = 0;
  for (const v of plan.volumes) {
    baseIntAno += n(v.volumeBaseSacas) - n(v.volumeExternoSacas);
    baseExtAno += n(v.volumeExternoSacas);
  }
  const fatorTotal =
    baseIntAno + baseExtAno > 0 ? (baseIntAno * multInterno + baseExtAno * multExterno) / (baseIntAno + baseExtAno) : 1;
  // Deságio de ACC (adiantamento de contrato de cambio) e despesa da
  // exportacao: cresce com o mercado externo, mesmo estando no grupo
  // Emprestimo e Financiamento.
  const cresceCom = (group: string, name: string): "INTERNO" | "EXTERNO" | "TOTAL" =>
    group === "DESPESA_MERCADO_INTERNO"
      ? "INTERNO"
      : group === "DESPESA_MERCADO_EXTERNO" || (group === "FINANCIAMENTO" && /des[aá]gio|acc/i.test(name))
        ? "EXTERNO"
        : "TOTAL";
  const fatorDespesa = (group: string, name: string) => {
    const c = cresceCom(group, name);
    return c === "INTERNO" ? multInterno : c === "EXTERNO" ? multExterno : fatorTotal;
  };

  const lines = plan.lines.map((line) => {
    const monthsByNum = new Map(line.months.map((m) => [m.month, m]));
    const fator = fatorDespesa(line.group, line.name);
    const porSaca = line.tipoCusto === "POR_SACA";
    const mensal = line.tipoCusto === "MENSAL";
    const percentual = line.tipoCusto === "PERCENTUAL";
    const valorPorSaca = n(line.valorPorSaca);
    const valorMensal = n(line.valorMensal);
    const valorPercentual = n(line.valorPercentual);
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const row = monthsByNum.get(m);
      // previstoBase = valor digitado (Conservador), usado na edicao.
      const previstoBase = mensal ? valorMensal : row ? n(row.valorPrevisto) : 0;
      const previsto = porSaca
        ? Number((valorPorSaca * volumePrevistoMes(m, line.baseVolume)).toFixed(2))
        : percentual
          ? Number(((valorPercentual / 100) * volumePrevistoMes(m, line.baseVolume) * cotacaoSacaUsd * cotacaoDolar).toFixed(2))
          : Number((previstoBase * fator).toFixed(2));
      const realizado = row ? n(row.valorRealizado) : 0;
      return { month: m, previsto, previstoBase, realizado, variacao: Number((realizado - previsto).toFixed(2)) };
    });
    const totalPrevisto = Number(months.reduce((s, m) => s + m.previsto, 0).toFixed(2));
    const totalRealizado = Number(months.reduce((s, m) => s + m.realizado, 0).toFixed(2));
    return {
      id: line.id,
      group: line.group,
      name: line.name,
      orderIndex: line.orderIndex,
      tipoCusto: line.tipoCusto as "FIXO" | "MENSAL" | "POR_SACA" | "PERCENTUAL" | "AUTOMATICO",
      regraImposto: (line.regraImposto ?? null) as RegraImposto | null,
      cresceCom: cresceCom(line.group, line.name),
      valorPorSaca,
      valorMensal,
      valorPercentual,
      baseVolume: line.baseVolume as "TOTAL" | "INTERNO" | "EXTERNO",
      months,
      totalPrevisto,
      totalRealizado,
    };
  });

  // Impostos automaticos (tipoCusto AUTOMATICO), mes a mes, regras de 2027:
  //  - PIS e COFINS: extintos em 01/01/2027 (CBS no lugar; cafe cru tem
  //    aliquota zero no mercado interno e exportacao e imune) -> 0;
  //  - DARE (ICMS interestadual): receita interna x % para outros estados x
  //    aliquota (dentro de MG o ICMS do cafe cru e diferido; exportacao nao
  //    incide);
  //  - IRPJ e CSLL (Lucro Real, estimativa mensal): lucro do mes = receita
  //    prevista - despesas previstas das demais linhas (sem Investimentos, que
  //    nao sao despesa) - DARE; IRPJ = 15% + 10% sobre o que passar de
  //    R$ 20 mil no mes (R$ 240 mil/ano); CSLL = 9%. Sem lucro, zero.
  const precoSaca = cotacaoSacaUsd * cotacaoDolar;
  const icmsPct = n(plan.icmsPctInterestadual);
  const icmsAliq = n(plan.icmsAliquotaInterestadual);
  const automaticas = lines.filter((l) => l.tipoCusto === "AUTOMATICO");

  // Folha automatica (Despesa com Pessoal), a partir das linhas digitadas de
  // Salario e Pro-labore do mes (ja no cenario):
  //  - Ferias + 1/3 = salario / 12 x 4/3 (provisao mensal);
  //  - 13o = salario / 12 (provisao mensal);
  //  - INSS = salario x (20% patronal + RAT ajustado + terceiros) + 20% do
  //    pro-labore (contribuinte individual: so a cota patronal);
  //  - FGTS = 8% do salario;
  //  - Encargos sobre provisao de 13o / ferias = provisao x (INSS da folha + FGTS).
  const ratAjustado = n(plan.ratAjustado);
  const terceirosFolha = n(plan.terceirosFolha);
  const aliqInssFolha = 0.2 + ratAjustado + terceirosFolha;
  const ALIQ_FGTS = 0.08;
  const somaPessoal = (m: number, re: RegExp) =>
    lines
      .filter((l) => l.tipoCusto !== "AUTOMATICO" && l.group === "DESPESA_PESSOAL" && re.test(l.name))
      .reduce((s, l) => s + l.months[m - 1].previsto, 0);
  const salarioMes = (m: number) => somaPessoal(m, /^\s*sal[aá]rio/i);
  const proLaboreMes = (m: number) => somaPessoal(m, /pr[oó][\s-]*labore/i);
  const r2 = (v: number) => Number(v.toFixed(2));
  const folha: Partial<Record<RegraImposto, (m: number) => number>> = {
    FERIAS: (m) => r2((salarioMes(m) / 12) * (4 / 3)),
    DECIMO_TERCEIRO: (m) => r2(salarioMes(m) / 12),
    INSS_FOLHA: (m) => r2(salarioMes(m) * aliqInssFolha + proLaboreMes(m) * 0.2),
    FGTS: (m) => r2(salarioMes(m) * ALIQ_FGTS),
    ENCARGOS_13: (m) => r2((salarioMes(m) / 12) * (aliqInssFolha + ALIQ_FGTS)),
    ENCARGOS_FERIAS: (m) => r2((salarioMes(m) / 12) * (4 / 3) * (aliqInssFolha + ALIQ_FGTS)),
  };
  for (const l of automaticas) {
    const regra = l.regraImposto ? folha[l.regraImposto] : undefined;
    if (!regra) continue;
    l.months = l.months.map((mm) => {
      const previsto = regra(mm.month);
      return { ...mm, previsto, previstoBase: previsto, variacao: Number((mm.realizado - previsto).toFixed(2)) };
    });
    l.totalPrevisto = Number(l.months.reduce((s, mm) => s + mm.previsto, 0).toFixed(2));
  }
  // Linhas que entram como despesa no lucro (IRPJ/CSLL): todas menos os
  // impostos automaticos (calculados abaixo) e Investimentos.
  const ehImpostoAuto = (l: (typeof lines)[number]) => l.tipoCusto === "AUTOMATICO" && !(l.regraImposto && folha[l.regraImposto]);
  const dareMes = (m: number) => Number((volumePrevistoMes(m, "INTERNO") * precoSaca * icmsPct * icmsAliq).toFixed(2));
  const temDare = automaticas.some((l) => l.regraImposto === "DARE");
  //  - Credito de CBS/IBS (valor negativo): exportacao imune e venda interna
  //    de cafe cru com aliquota zero MANTEM os creditos das compras; credito =
  //    parcela de CBS/IBS contida no total das despesas creditaveis do mes
  //    (notas com o tributo "por fora" somado: total x aliq / (100 + aliq)).
  const aliqCbsIbs = ALIQ_CBS_2027 + ALIQ_IBS_2027;
  const creditoMes = (m: number) =>
    -Number(
      (
        lines
          .filter((l) => l.tipoCusto !== "AUTOMATICO" && ehDespesaCreditavel(l.group, l.name))
          .reduce((s, l) => s + l.months[m - 1].previsto, 0) *
        (aliqCbsIbs / (100 + aliqCbsIbs))
      ).toFixed(2)
    );
  const temCredito = automaticas.some((l) => l.regraImposto === "CREDITO_CBS_IBS");
  const lucroMes = (m: number) =>
    volumePrevistoMes(m, "TOTAL") * precoSaca -
    lines
      .filter((l) => !ehImpostoAuto(l) && l.group !== "INVESTIMENTOS")
      .reduce((s, l) => s + l.months[m - 1].previsto, 0) -
    (temDare ? dareMes(m) : 0) -
    (temCredito ? creditoMes(m) : 0);
  for (const l of automaticas.filter(ehImpostoAuto)) {
    l.months = l.months.map((mm) => {
      const lucro = Math.max(lucroMes(mm.month), 0);
      const previsto =
        l.regraImposto === "DARE"
          ? dareMes(mm.month)
          : l.regraImposto === "CREDITO_CBS_IBS"
          ? creditoMes(mm.month)
          : l.regraImposto === "IRPJ"
            ? Number((lucro * 0.15 + Math.max(lucro - IRPJ_ADICIONAL_MES, 0) * 0.1).toFixed(2))
            : l.regraImposto === "CSLL"
              ? Number((lucro * 0.09).toFixed(2))
              : 0;
      return { ...mm, previsto, previstoBase: previsto, variacao: Number((mm.realizado - previsto).toFixed(2)) };
    });
    l.totalPrevisto = Number(l.months.reduce((s, mm) => s + mm.previsto, 0).toFixed(2));
  }

  // Volume/receita mes a mes: volume ajustado pelo cenario x cotacao saca x
  // cambio. Realizado (volume e receita) e informado manualmente.
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const v = volumeByMonth.get(m);
    const volumeBaseSacas = v ? n(v.volumeBaseSacas) : 0;
    const volumeExternoSacas = v ? n(v.volumeExternoSacas) : 0;
    const volumeInternoPrevisto = Number(((volumeBaseSacas - volumeExternoSacas) * multInterno).toFixed(2));
    const volumeExternoPrevisto = Number((volumeExternoSacas * multExterno).toFixed(2));
    const volumeAjustado = Number((volumeInternoPrevisto + volumeExternoPrevisto).toFixed(2));
    const receitaPrevista = Number((volumeAjustado * cotacaoSacaUsd * cotacaoDolar).toFixed(2));
    const receitaRealizada = v ? n(v.receitaRealizada) : 0;
    const despesaPrevista = Number(
      lines.reduce((s, l) => s + (l.months.find((mm) => mm.month === m)?.previsto ?? 0), 0).toFixed(2)
    );
    const despesaRealizada = Number(
      lines.reduce((s, l) => s + (l.months.find((mm) => mm.month === m)?.realizado ?? 0), 0).toFixed(2)
    );
    const resultadoPrevisto = Number((receitaPrevista - despesaPrevista).toFixed(2));
    const resultadoRealizado = Number((receitaRealizada - despesaRealizada).toFixed(2));

    return {
      month: m,
      label: MONTH_LABELS[i],
      volumeBaseSacas,
      volumeAjustado,
      volumeInternoPrevisto,
      volumeExternoPrevisto,
      volumeInternoRealizado: v ? n(v.volumeInternoRealizado) : 0,
      volumeExternoRealizado: v ? n(v.volumeExternoRealizado) : 0,
      receitaPrevista,
      receitaRealizada,
      despesaPrevista,
      despesaRealizada,
      resultadoPrevisto,
      resultadoRealizado,
    };
  });

  const groups = BUDGET_GROUP_ORDER.map((group) => {
    const groupLines = lines.filter((l) => l.group === group);
    const totalPrevisto = Number(groupLines.reduce((s, l) => s + l.totalPrevisto, 0).toFixed(2));
    const totalRealizado = Number(groupLines.reduce((s, l) => s + l.totalRealizado, 0).toFixed(2));
    return { group, label: BUDGET_GROUP_LABELS[group], lines: groupLines, totalPrevisto, totalRealizado };
  });

  const totais = {
    receitaPrevista: Number(months.reduce((s, m) => s + m.receitaPrevista, 0).toFixed(2)),
    receitaRealizada: Number(months.reduce((s, m) => s + m.receitaRealizada, 0).toFixed(2)),
    despesaPrevista: Number(months.reduce((s, m) => s + m.despesaPrevista, 0).toFixed(2)),
    despesaRealizada: Number(months.reduce((s, m) => s + m.despesaRealizada, 0).toFixed(2)),
    resultadoPrevisto: Number(months.reduce((s, m) => s + m.resultadoPrevisto, 0).toFixed(2)),
    resultadoRealizado: Number(months.reduce((s, m) => s + m.resultadoRealizado, 0).toFixed(2)),
  };

  // Ponto de Equilibrio, calculado corretamente (margem de contribuicao):
  // custos fixos / (1 - % de custo variavel sobre a receita). O arquivo
  // original tinha essa conta quebrada (dividia por uma celula vazia); aqui
  // o denominador e sempre guardado contra receita/percentual zerado ou >=100%.
  const custosVariaveisPrevisto = groups
    .filter((g) => CUSTO_VARIAVEL_GROUPS.includes(g.group))
    .reduce((s, g) => s + g.totalPrevisto, 0);
  const custosFixosPrevisto = groups
    .filter((g) => CUSTO_FIXO_GROUPS.includes(g.group))
    .reduce((s, g) => s + g.totalPrevisto, 0);
  const custosVariaveisPercent =
    totais.receitaPrevista > 0 ? custosVariaveisPrevisto / totais.receitaPrevista : 0;
  const pontoEquilibrio = {
    custosFixos: Number(custosFixosPrevisto.toFixed(2)),
    custosVariaveisPercent: Number(custosVariaveisPercent.toFixed(4)),
    valorReais:
      custosVariaveisPercent < 1
        ? Number((custosFixosPrevisto / (1 - custosVariaveisPercent)).toFixed(2))
        : null,
  };

  // Caixa de Seguranca: meses de despesa total media coberta, nas 3 faixas
  // classicas (Bom/Otimo/Excelente = 6/12/18 meses).
  const mediaDespesaMensal = Number((totais.despesaPrevista / 12).toFixed(2));
  const caixaSeguranca = {
    mediaDespesaMensal,
    bom: Number((mediaDespesaMensal * 6).toFixed(2)),
    otimo: Number((mediaDespesaMensal * 12).toFixed(2)),
    excelente: Number((mediaDespesaMensal * 18).toFixed(2)),
  };

  return {
    id: plan.id,
    year: plan.year,
    name: plan.name,
    scenario: cenario,
    scenarioSalvo: plan.scenario,
    cotacaoSacaUsd,
    nivelBolsa: n(plan.nivelBolsa),
    diferencial: n(plan.diferencial),
    cotacaoDolar,
    crescimentoModerado: n(plan.crescimentoModerado),
    crescimentoOtimista: n(plan.crescimentoOtimista),
    crescimentoMuitoOtimista: n(plan.crescimentoMuitoOtimista),
    crescimentoModeradoExterno: n(plan.crescimentoModeradoExterno),
    crescimentoOtimistaExterno: n(plan.crescimentoOtimistaExterno),
    crescimentoMuitoOtimistaExterno: n(plan.crescimentoMuitoOtimistaExterno),
    fatorDespesas: { interno: multInterno, externo: multExterno, total: fatorTotal },
    precoSacaInterno: plan.precoSacaInterno != null ? n(plan.precoSacaInterno) : null,
    precoSacaExterno: plan.precoSacaExterno != null ? n(plan.precoSacaExterno) : null,
    icmsPctInterestadual: icmsPct,
    icmsAliquotaInterestadual: icmsAliq,
    ratAjustado,
    terceirosFolha,
    months,
    groups,
    totais,
    pontoEquilibrio,
    caixaSeguranca,
  };
}

export type BudgetPlanData = Awaited<ReturnType<typeof getBudgetPlan>>;
export type BudgetGroupData = NonNullable<BudgetPlanData>["groups"][number];
export type BudgetLineData = BudgetGroupData["lines"][number];
export type BudgetMonthData = NonNullable<BudgetPlanData>["months"][number];

// Historico mensal de vendas liquidas de devolucoes (sacas e R$) por mercado,
// para a projecao do proximo ano (ver src/lib/budget-projecao.ts). Mesma base
// de Faturamento: Sale menos SaleReturn, devolucao classificada pelo tipo do
// cliente resolvido no cadastro de vendas.
export async function getHistoricoVendasMensal() {
  const [sales, returns] = await Promise.all([getSales(), getSaleReturns()]);
  const map = new Map<string, HistoricoMes>();
  const get = (ym: string) => {
    let h = map.get(ym);
    if (!h) {
      h = { ym, internoSacas: 0, internoReceita: 0, externoSacas: 0, externoReceita: 0 };
      map.set(ym, h);
    }
    return h;
  };
  for (const s of sales) {
    const h = get(s.saleDate.slice(0, 7));
    if (s.clientType === "INTERNO") {
      h.internoSacas += s.quantitySacas;
      h.internoReceita += s.valueBRL;
    } else {
      h.externoSacas += s.quantitySacas;
      h.externoReceita += s.valueBRL;
    }
  }
  let devolucoesSemTipo = 0;
  for (const r of returns) {
    if (!r.clientType) {
      devolucoesSemTipo++;
      continue;
    }
    const h = get(r.returnDate.slice(0, 7));
    if (r.clientType === "INTERNO") {
      h.internoSacas -= r.quantitySacas;
      h.internoReceita -= r.valueBRL;
    } else {
      h.externoSacas -= r.quantitySacas;
      h.externoReceita -= r.valueBRL;
    }
  }
  const historico = [...map.values()].sort((a, b) => a.ym.localeCompare(b.ym));

  // Ultimo mes fechado com dado: o mes corrente (em andamento) nunca entra.
  const hoje = new Date();
  const mesCorrente = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const fechados = historico.filter((h) => h.ym < mesCorrente);
  const ultimoMesFechado = fechados.length ? fechados[fechados.length - 1].ym : null;

  return { historico: fechados, ultimoMesFechado, devolucoesSemTipo };
}

export type HistoricoVendasData = Awaited<ReturnType<typeof getHistoricoVendasMensal>>;

// Volumes base mes a mes para gravar no plano (BudgetVolumeMonth): ultimos 12
// meses fechados por mercado, distribuidos pela sazonalidade dos ultimos 24
// meses - a mesma conta do painel de projecao. SEM crescimento: o plano aplica
// o multiplicador do cenario na leitura (scenarioMultiplier), entao gravar o
// volume ja crescido contaria o crescimento duas vezes.
export async function calcularVolumesBaseProjecao() {
  const { historico, ultimoMesFechado } = await getHistoricoVendasMensal();
  if (!ultimoMesFechado) return null;
  const ltmDe = addMonths(ultimoMesFechado, -11);
  const sazDe = addMonths(ultimoMesFechado, -23);
  const baseI = somaJanela(historico, ltmDe, ultimoMesFechado, "INTERNO").sacas;
  const baseE = somaJanela(historico, ltmDe, ultimoMesFechado, "EXTERNO").sacas;
  const sazI = sazonalidade(historico, sazDe, ultimoMesFechado, "INTERNO");
  const sazE = sazonalidade(historico, sazDe, ultimoMesFechado, "EXTERNO");
  const meses = sazI.map((_, i) => {
    const interno = Number((baseI * sazI[i]).toFixed(2));
    const externo = Number((baseE * sazE[i]).toFixed(2));
    return { month: i + 1, volumeBaseSacas: Number((interno + externo).toFixed(2)), volumeExternoSacas: externo };
  });
  return { meses, ultimoMesFechado, ltmDe };
}

// Base real para estimar compras de cafe e IRPJ/CSLL no quadro de impostos do
// orcamento: ultimos 3 meses de DRE da Analise de Credito (PDF contabil).
//  - cmvSobreReceita = CMV / receita bruta (proxy do valor de compra de cafe;
//    a Nayme e comercial exportadora, o CMV e quase todo cafe comprado);
//  - lairSobreReceita = (lucro liquido + provisao IRPJ/CSLL) / receita bruta.
export async function getBaseFiscalDre() {
  const regs = await prisma.analiseCredito.findMany({ orderBy: { competencia: "desc" }, take: 3 });
  if (regs.length === 0) return null;
  let receita = 0;
  let cmv = 0;
  let lair = 0;
  for (const r of regs) {
    const dre = r.dre as Record<string, number>;
    const conf = r.conferenciaPdf as Record<string, number>;
    receita += Number(dre.receitaBruta ?? 0);
    cmv += Number(dre.cmv ?? 0);
    lair += Number(conf.lucroLiquido ?? 0) + Number(dre.irCs ?? 0);
  }
  const meses = regs.map((r) => r.competencia.toISOString().slice(0, 7)).sort();
  return {
    de: meses[0],
    ate: meses[meses.length - 1],
    cmvSobreReceita: receita > 0 ? cmv / receita : 0,
    lairSobreReceita: receita > 0 ? lair / receita : 0,
  };
}

// Tudo que as paginas de Historico e Projecoes, Premissas e Tributos precisam:
// plano do ano, historico de vendas, base fiscal da DRE, despesas que geram
// credito de CBS/IBS e os crescimentos por cenario.
export async function getContextoProjecao(yearParam?: string) {
  const years = await getBudgetYears();
  const year = yearParam ? Number(yearParam) : years[0] ?? new Date().getFullYear();
  const [plan, vendas, baseFiscal] = await Promise.all([getBudgetPlan(year), getHistoricoVendasMensal(), getBaseFiscalDre()]);
  // Despesas previstas com fornecedores PJ (geram credito de CBS/IBS em 2027):
  // mercado interno/externo, administrativas e, do custo do fornecedor, so
  // fretes e armazenagem (o custo do cafe e o Funrural ficam de fora).
  const despesasCreditaveis = (plan?.groups ?? [])
    .flatMap((g) => g.lines.map((l) => ({ group: g.group, name: l.name, total: l.totalPrevisto })))
    .filter((l) => ehDespesaCreditavel(l.group, l.name))
    .reduce((s, l) => s + l.total, 0);
  const crescimentos = {
    CONSERVADOR: { interno: 0, externo: 0 },
    MODERADO: { interno: plan?.crescimentoModerado ?? 0, externo: plan?.crescimentoModeradoExterno ?? 0 },
    OTIMISTA: { interno: plan?.crescimentoOtimista ?? 0, externo: plan?.crescimentoOtimistaExterno ?? 0 },
    MUITO_OTIMISTA: { interno: plan?.crescimentoMuitoOtimista ?? 0, externo: plan?.crescimentoMuitoOtimistaExterno ?? 0 },
  };
  return { year, plan, vendas, baseFiscal, despesasCreditaveis, crescimentos };
}
