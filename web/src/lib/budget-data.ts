import { prisma } from "@/lib/prisma";
import { BudgetGroup, BudgetScenario } from "@/generated/prisma/client";

function n(value: unknown): number {
  return Number(value);
}

export const BUDGET_GROUP_ORDER: BudgetGroup[] = [
  "CUSTO_FORNECEDOR",
  "DESPESA_MERCADO_INTERNO",
  "DESPESA_MERCADO_EXTERNO",
  "DESPESA_ADM_FIXA",
  "DESPESA_ADM_VARIAVEL",
  "DESPESA_PESSOAL",
  "IMPOSTOS",
  "FINANCIAMENTO",
  "INVESTIMENTOS",
];

export const BUDGET_GROUP_LABELS: Record<BudgetGroup, string> = {
  CUSTO_FORNECEDOR: "Custo Fornecedor",
  DESPESA_MERCADO_INTERNO: "Despesas Mercado Interno",
  DESPESA_MERCADO_EXTERNO: "Despesas Mercado Externo",
  DESPESA_ADM_FIXA: "Despesas Administrativas Fixas",
  DESPESA_ADM_VARIAVEL: "Despesas Administrativas Variáveis",
  DESPESA_PESSOAL: "Despesa com Pessoal",
  IMPOSTOS: "Impostos",
  FINANCIAMENTO: "Empréstimo e Financiamento",
  INVESTIMENTOS: "Investimentos",
};

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

export const SCENARIO_LABELS: Record<BudgetScenario, string> = {
  CONSERVADOR: "Conservador",
  MODERADO: "Moderado",
  OTIMISTA: "Otimista",
  MUITO_OTIMISTA: "Muito Otimista",
};

export async function getBudgetYears() {
  const plans = await prisma.budgetPlan.findMany({ select: { year: true }, orderBy: { year: "desc" } });
  return plans.map((p) => p.year);
}

// Multiplicador de crescimento do cenario selecionado sobre o volume base
// (Conservador = 1, sem crescimento).
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

export async function getBudgetPlan(year: number) {
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
  const multiplier = scenarioMultiplier({
    scenario: plan.scenario,
    crescimentoModerado: n(plan.crescimentoModerado),
    crescimentoOtimista: n(plan.crescimentoOtimista),
    crescimentoMuitoOtimista: n(plan.crescimentoMuitoOtimista),
  });

  const volumeByMonth = new Map(plan.volumes.map((v) => [v.month, v]));

  const lines = plan.lines.map((line) => {
    const monthsByNum = new Map(line.months.map((m) => [m.month, m]));
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const row = monthsByNum.get(m);
      const previsto = row ? n(row.valorPrevisto) : 0;
      const realizado = row ? n(row.valorRealizado) : 0;
      return { month: m, previsto, realizado, variacao: Number((realizado - previsto).toFixed(2)) };
    });
    const totalPrevisto = Number(months.reduce((s, m) => s + m.previsto, 0).toFixed(2));
    const totalRealizado = Number(months.reduce((s, m) => s + m.realizado, 0).toFixed(2));
    return {
      id: line.id,
      group: line.group,
      name: line.name,
      orderIndex: line.orderIndex,
      months,
      totalPrevisto,
      totalRealizado,
    };
  });

  // Volume/receita mes a mes: volume ajustado pelo cenario x cotacao saca x
  // cambio. Realizado (volume e receita) e informado manualmente.
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const v = volumeByMonth.get(m);
    const volumeBaseSacas = v ? n(v.volumeBaseSacas) : 0;
    const volumeExternoSacas = v ? n(v.volumeExternoSacas) : 0;
    const volumeAjustado = Number((volumeBaseSacas * multiplier).toFixed(2));
    const volumeInternoPrevisto = Number((volumeAjustado - volumeExternoSacas * multiplier).toFixed(2));
    const volumeExternoPrevisto = Number((volumeExternoSacas * multiplier).toFixed(2));
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
    scenario: plan.scenario,
    cotacaoSacaUsd,
    cotacaoDolar,
    crescimentoModerado: n(plan.crescimentoModerado),
    crescimentoOtimista: n(plan.crescimentoOtimista),
    crescimentoMuitoOtimista: n(plan.crescimentoMuitoOtimista),
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
