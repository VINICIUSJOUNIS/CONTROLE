// Analise de Credito - motor de calculo mensal.
//
// Recalcula, mes a mes, tudo o que a planilha "Analise de Balanco para Credito"
// calculava por ano (abas Input Automatico, Analise e Fluxo de Caixa Ebitda),
// com as correcoes listadas em NOTAS_METODOLOGIA. Cada indicador sai com:
// o que e, a formula, os numeros usados (ligados as contas do PDF) e a leitura.

import {
  CAMPOS_BALANCO,
  CAMPOS_DRE,
  CAMPO_POR_CHAVE,
  type Balanco,
  type ChaveBalanco,
  type Dre,
  type DreTipo,
  type GrupoBalanco,
} from "./campos";

export type RegistroCredito = {
  id: string;
  competencia: string; // AAAA-MM
  empresa: string;
  cnpj: string;
  dataBalanco: string;
  dataBalancoAnterior: string | null;
  dreTipo: DreTipo;
  dreInicio: string | null;
  dreFim: string;
  balanco: Balanco;
  balancoAnterior: Balanco | null;
  dre: Dre;
  origens: Record<string, { codigo: string; descricao: string; valor: number }[]>;
  conferenciaPdf: { totalAtivo: number; totalPassivoPl: number; totalAtivoAnterior: number | null; lucroLiquido: number };
  observacoes: string[];
  arquivos: string[];
  documentos: string[];
};

export type Formato = "moeda" | "pct" | "vezes" | "dias" | "texto";
export type Tom = "bom" | "atencao" | "ruim" | "neutro";

export type Componente = { rotulo: string; valor: number | null; formato?: Formato | string; campos?: string[]; sinal?: string };

export type Indicador = {
  chave: string;
  titulo: string;
  valor: number | null;
  valorTexto?: string;
  formato: Formato;
  anterior: number | null;
  oQueE: string;
  formula: string;
  componentes: Componente[];
  leitura: string;
  tom: Tom;
};

export type Linha = {
  rotulo: string;
  valor: number;
  anterior: number | null;
  av: number | null; // analise vertical (fracao)
  ah: number | null; // analise horizontal (fracao)
  nivel: 0 | 1 | 2; // 0 = total, 1 = grupo, 2 = conta
  campos?: string[];
};

export type Conferencia = { titulo: string; ok: boolean; detalhe: string };

export type Analise = {
  registro: RegistroCredito;
  periodo: { descricao: string; dias: number; meses: number; mensal: boolean };
  temAnterior: boolean;
  fonteAnterior: string;
  ativo: Linha[];
  passivo: Linha[];
  dre: Linha[];
  dfc: Linha[] | null;
  secoes: { titulo: string; descricao: string; indicadores: Indicador[] }[];
  conferencias: Conferencia[];
};

// ---------------------------------------------------------------------------
// Formatacao (texto das leituras)

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const num = (v: number, d = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number, d = 1) => `${num(v * 100, d)}%`;

export function formatar(v: number | null, formato: Formato) {
  if (v === null || !Number.isFinite(v)) return "-";
  switch (formato) {
    case "moeda":
      return brl(v);
    case "pct":
      return pct(v);
    case "vezes":
      return `${num(v)}x`;
    case "dias":
      return `${num(v, 0)} dias`;
    default:
      return num(v);
  }
}

const div = (a: number, b: number) => (b === 0 || !Number.isFinite(a) || !Number.isFinite(b) ? null : a / b);

// ---------------------------------------------------------------------------
// Balanco: totais e Patrimonio Liquido ajustado

const camposDoGrupo = (g: GrupoBalanco) => CAMPOS_BALANCO.filter((c) => c.grupo === g).map((c) => c.chave as ChaveBalanco);
const soma = (b: Balanco, chaves: ChaveBalanco[]) => chaves.reduce((s, k) => s + (b[k] ?? 0), 0);

const RLP: ChaveBalanco[] = ["rlpClientes", "rlpTributos", "rlpDepositosJudiciais", "rlpPartesRelacionadas", "rlpOutros"];

export type Totais = {
  ac: number;
  rlp: number;
  imobilizadoLiquido: number;
  anc: number;
  at: number;
  pc: number;
  pnc: number;
  plContabil: number;
  diferenca: number; // AT - (PC + PNC + PL): resultado ainda nao incorporado ao PL
  pl: number; // PL ajustado (contabil + diferenca)
  caixaDisponivel: number; // caixa + aplicacoes de liquidez imediata
  dividaBancaria: number; // emprestimos CP + ACC + LP
  dividaBruta: number; // divida bancaria + mutuos de socios/coligadas
  dividaLiquida: number;
  ativoOperacional: number;
  passivoOperacional: number;
};

export function totais(b: Balanco): Totais {
  const ac = soma(b, camposDoGrupo("ativoCirculante"));
  const rlp = soma(b, RLP);
  const imobilizadoLiquido = b.imobilizadoBruto - b.depreciacaoAcumulada;
  const anc = rlp + b.investimentos + imobilizadoLiquido + b.intangivel;
  const at = ac + anc;
  const pc = soma(b, camposDoGrupo("passivoCirculante"));
  const pnc = soma(b, camposDoGrupo("passivoNaoCirculante"));
  const plContabil = soma(b, camposDoGrupo("patrimonioLiquido"));
  const diferenca = at - (pc + pnc + plContabil);
  const caixaDisponivel = b.caixa + b.aplicacoesFinanceiras;
  const dividaBancaria = b.emprestimosCP + b.accAce + b.emprestimosLP;
  const dividaBruta = dividaBancaria + b.partesRelacionadasCP + b.partesRelacionadasLP;
  return {
    ac,
    rlp,
    imobilizadoLiquido,
    anc,
    at,
    pc,
    pnc,
    plContabil,
    diferenca,
    pl: plContabil + diferenca,
    caixaDisponivel,
    dividaBancaria,
    dividaBruta,
    dividaLiquida: dividaBruta - caixaDisponivel,
    ativoOperacional: soma(b, AO),
    passivoOperacional: soma(b, PO),
  };
}

// Modelo Fleuriet: contas ciclicas (operacionais) do circulante.
const AO: ChaveBalanco[] = [
  "clientes",
  "clientesPartesRelacionadas",
  "estoques",
  "adiantamentoFornecedores",
  "tributosRecuperar",
  "outrosAtivosOperacionaisCirc",
];
const PO: ChaveBalanco[] = [
  "fornecedores",
  "salariosEncargos",
  "impostosRecolher",
  "irCsRecolher",
  "adiantamentosClientes",
  "outrosPassivosCirc",
];

// ---------------------------------------------------------------------------
// DRE por funcao

export type DreCalc = Dre & {
  receitaLiquida: number;
  lucroBruto: number;
  despesasOperacionais: number;
  depreciacaoUsada: number; // D&A destacada na DRE ou estimada pelo balanco
  depreciacaoEstimada: boolean;
  ebit: number;
  ebitda: number;
  resultadoFinanceiro: number;
  lair: number;
  lucroLiquido: number;
  aliquotaEfetiva: number | null; // IR/CSLL ÷ LAIR
  irComplementar: number; // IR/CSLL que falta para a aliquota minima legal (0 se a provisao for suficiente)
  lucroAjustado: number; // lucro liquido com a provisao de IR/CSLL complementada
};

// Lucro real: IRPJ 15% + adicional 10% + CSLL 9% = 34%. Mesmo compensando
// prejuizo fiscal (limite de 30% do lucro - Lei 9.065/95, art. 15), a aliquota
// efetiva minima e 34% x 70% = 23,8%. Abaixo disso a provisao esta incompleta.
export const ALIQUOTA_IR_CS = 0.34;
export const ALIQUOTA_MINIMA_IR_CS = ALIQUOTA_IR_CS * 0.7;

export function calcularDre(d: Dre, depreciacaoBalanco: number | null): DreCalc {
  const receitaLiquida = d.receitaBruta - d.deducoes;
  const lucroBruto = receitaLiquida - d.cmv;
  const despesasOperacionais =
    d.despesasVendas + d.despesasAdministrativas + d.despesasTributarias + d.depreciacaoAmortizacao + d.outrasDespesasOperacionais;
  const ebit = lucroBruto - despesasOperacionais + d.outrasReceitasOperacionais + d.equivalenciaPatrimonial;
  // Se a DRE nao destaca a depreciacao, ela esta embutida nas despesas: estima-se
  // pela variacao da depreciacao acumulada no balanco (sem baixas no mes).
  const depreciacaoEstimada = d.depreciacaoAmortizacao === 0 && (depreciacaoBalanco ?? 0) > 0;
  const depreciacaoUsada = depreciacaoEstimada ? (depreciacaoBalanco as number) : d.depreciacaoAmortizacao;
  // EBITDA ajustado para credito: EBIT + D&A, sem a equivalencia patrimonial
  // (resultado de coligadas, nao gera caixa). Equivale a Resolucao CVM 156/2022
  // (LL + IR/CS + resultado financeiro + D&A) excluida a equivalencia.
  const ebitda = ebit - d.equivalenciaPatrimonial + depreciacaoUsada;
  const resultadoFinanceiro = d.receitasFinanceiras - d.despesasFinanceiras + d.variacaoCambialLiquida;
  const lair = ebit + resultadoFinanceiro + d.resultadoNaoOperacional;
  const lucroLiquido = lair - d.irCs - d.participacoes;
  const aliquotaEfetiva = lair > 0 ? d.irCs / lair : null;
  const irComplementar = lair > 0 && d.irCs < lair * ALIQUOTA_MINIMA_IR_CS ? lair * ALIQUOTA_IR_CS - d.irCs : 0;
  return {
    ...d,
    receitaLiquida,
    lucroBruto,
    despesasOperacionais,
    depreciacaoUsada,
    depreciacaoEstimada,
    ebit,
    ebitda,
    resultadoFinanceiro,
    lair,
    lucroLiquido,
    aliquotaEfetiva,
    irComplementar,
    lucroAjustado: lucroLiquido - irComplementar,
  };
}

const subtrairDre = (a: Dre, b: Dre) =>
  Object.fromEntries(CAMPOS_DRE.map((c) => [c.chave, a[c.chave] - b[c.chave]])) as Dre;
export const somarDre = (a: Dre, b: Dre) =>
  Object.fromEntries(CAMPOS_DRE.map((c) => [c.chave, a[c.chave] + b[c.chave]])) as Dre;

const mesAnterior = (comp: string) => {
  const [a, m] = comp.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
};

// DRE acumulada no ano ate a competencia (null se faltar algum mes).
function dreAcumuladaAno(comp: string, porComp: Map<string, RegistroCredito>): Dre | null {
  const r = porComp.get(comp);
  if (!r) return null;
  if (r.dreTipo === "acumulado") return r.dre;
  const mes = Number(comp.slice(5, 7));
  if (mes === 1) return r.dre;
  const ant = dreAcumuladaAno(mesAnterior(comp), porComp);
  return ant ? somarDre(ant, r.dre) : null;
}

// DRE isolada do mes (null quando a DRE e acumulada e falta o mes anterior).
export function dreDoMes(comp: string, porComp: Map<string, RegistroCredito>): Dre | null {
  const r = porComp.get(comp);
  if (!r) return null;
  if (r.dreTipo === "mensal" || Number(comp.slice(5, 7)) === 1) return r.dre;
  const antAcum = dreAcumuladaAno(mesAnterior(comp), porComp);
  return antAcum ? subtrairDre(r.dre, antAcum) : null;
}

// Depreciacao do mes estimada pela variacao da depreciacao acumulada (null sem balanco anterior).
export function depreciacaoDoMes(comp: string, porComp: Map<string, RegistroCredito>): number | null {
  const r = porComp.get(comp);
  if (!r) return null;
  const ant = porComp.get(mesAnterior(comp))?.balanco ?? r.balancoAnterior;
  if (!ant) return null;
  const dep = r.balanco.depreciacaoAcumulada - ant.depreciacaoAcumulada;
  return dep > 0 ? dep : null;
}

// ---------------------------------------------------------------------------
// Analise completa de uma competencia

// Periodo customizado (ex.: trimestre): DRE ja somada do periodo, quantidade de
// meses e o balanco do fim do periodo anterior para as comparacoes. Sem ele,
// o periodo e o mes isolado da competencia (ou o acumulado do ano).
export type PeriodoCustom = {
  descricao: string;
  meses: number;
  dre: Dre;
  balancoAnterior: Balanco | null;
  fonteAnterior: string;
  dreAnterior: Dre | null;
  depreciacaoAnterior: number | null;
};

export function analisar(registro: RegistroCredito, historico: RegistroCredito[], custom?: PeriodoCustom): Analise {
  const porComp = new Map(historico.map((r) => [r.competencia, r]));
  porComp.set(registro.competencia, registro);
  const comp = registro.competencia;
  const mes = Number(comp.slice(5, 7));

  // Balanco do mes anterior: registro salvo do mes anterior ou a coluna "saldo anterior" do proprio PDF.
  const regAnt = porComp.get(mesAnterior(comp));
  const balAnt = custom ? custom.balancoAnterior : (regAnt?.balanco ?? registro.balancoAnterior);
  const fonteAnterior = custom
    ? custom.fonteAnterior
    : regAnt
    ? `balanço de ${rotuloCompetencia(regAnt.competencia)} salvo no sistema`
    : registro.balancoAnterior
      ? "coluna de saldo anterior do próprio PDF"
      : "sem balanço anterior";

  const b = registro.balanco;
  const t = totais(b);
  const ta = balAnt ? totais(balAnt) : null;

  const deprecBalanco = balAnt ? b.depreciacaoAcumulada - balAnt.depreciacaoAcumulada : null;

  // Periodo da DRE usada nos indicadores: o mes isolado (30 dias, convencao
  // comercial 30/360 da planilha) ou, sem ele, o acumulado do ano.
  // Periodo custom: DRE e balanco anterior cobrem o mesmo intervalo, entao a
  // variacao da depreciacao acumulada ja e a do periodo inteiro (sem x meses)
  // e o fluxo de caixa pode ser montado como no mes isolado.
  const mesIsolado = custom ? null : dreDoMes(comp, porComp);
  const dreBase = custom ? custom.dre : (mesIsolado ?? registro.dre);
  const meses = custom ? custom.meses : mesIsolado ? 1 : mes;
  const periodo = {
    descricao: custom ? custom.descricao : mesIsolado ? `mês de ${rotuloCompetencia(comp)}` : `acumulado de jan a ${rotuloCompetencia(comp)}`,
    dias: meses * 30,
    meses,
    mensal: custom ? true : !!mesIsolado,
  };
  const d = calcularDre(dreBase, deprecBalanco !== null && deprecBalanco > 0 ? (custom ? deprecBalanco : deprecBalanco * meses) : null);
  const dreAntMes = custom ? custom.dreAnterior : regAnt ? dreDoMes(regAnt.competencia, porComp) : null;
  const dAnt = custom
    ? dreAntMes
      ? calcularDre(dreAntMes, custom.depreciacaoAnterior)
      : null
    : dreAntMes && regAnt
      ? calcularDre(dreAntMes, depreciacaoDoMes(regAnt.competencia, porComp))
      : null;

  // EBITDA dos ultimos 12 meses quando houver 12 meses seguidos; senao anualizado.
  const ltm = ebitdaUltimos12(comp, porComp);
  const ebitdaAnual = ltm ?? (d.ebitda * 12) / meses;

  // ------------------------------------------------------------------ Balanco
  const linha = (rotulo: string, valor: number, anterior: number | null, base: number, baseAnt: number | null, nivel: 0 | 1 | 2, campos?: string[]): Linha => ({
    rotulo,
    valor,
    anterior,
    av: div(valor, base),
    ah: anterior === null ? null : div(valor - anterior, Math.abs(anterior)),
    nivel,
    campos,
  });
  const contas = (g: GrupoBalanco, base: number, baseAnt: number | null) =>
    CAMPOS_BALANCO.filter((c) => c.grupo === g && c.chave !== "imobilizadoBruto" && c.chave !== "depreciacaoAcumulada")
      .map((c) => linha(c.rotulo, b[c.chave], balAnt ? balAnt[c.chave] : null, base, baseAnt, 2, [c.chave]))
      .filter((l) => l.valor !== 0 || (l.anterior ?? 0) !== 0);

  const ativo: Linha[] = [
    linha("Ativo Circulante", t.ac, ta?.ac ?? null, t.at, ta?.at ?? null, 1),
    ...contas("ativoCirculante", t.at, ta?.at ?? null),
    linha("Ativo Não Circulante", t.anc, ta?.anc ?? null, t.at, ta?.at ?? null, 1),
    ...contas("ativoNaoCirculante", t.at, ta?.at ?? null),
    linha("Imobilizado Líquido", t.imobilizadoLiquido, ta?.imobilizadoLiquido ?? null, t.at, ta?.at ?? null, 2, ["imobilizadoBruto", "depreciacaoAcumulada"]),
    linha("Total do Ativo", t.at, ta?.at ?? null, t.at, ta?.at ?? null, 0),
  ];
  const passivo: Linha[] = [
    linha("Passivo Circulante", t.pc, ta?.pc ?? null, t.at, ta?.at ?? null, 1),
    ...contas("passivoCirculante", t.at, ta?.at ?? null),
    linha("Passivo Não Circulante", t.pnc, ta?.pnc ?? null, t.at, ta?.at ?? null, 1),
    ...contas("passivoNaoCirculante", t.at, ta?.at ?? null),
    linha("Patrimônio Líquido", t.pl, ta?.pl ?? null, t.at, ta?.at ?? null, 1),
    ...contas("patrimonioLiquido", t.at, ta?.at ?? null),
    ...(Math.abs(t.diferenca) >= 1 || Math.abs(ta?.diferenca ?? 0) >= 1
      ? [linha("Resultado do período não incorporado ao PL", t.diferenca, ta?.diferenca ?? null, t.at, ta?.at ?? null, 2)]
      : []),
    linha("Total do Passivo + PL", t.pc + t.pnc + t.pl, ta ? ta.pc + ta.pnc + ta.pl : null, t.at, ta?.at ?? null, 0),
  ];

  // ---------------------------------------------------------------------- DRE
  const rl = d.receitaLiquida;
  const lDre = (rotulo: string, v: number, ant: number | null, nivel: 0 | 1 | 2, campos?: string[]): Linha => ({
    rotulo,
    valor: v,
    anterior: ant,
    av: div(v, rl),
    ah: ant === null ? null : div(v - ant, Math.abs(ant)),
    nivel,
    campos,
  });
  const da = (k: keyof DreCalc) => (dAnt ? (dAnt[k] as number) : null);
  const dre: Linha[] = [
    lDre("Receita Operacional Bruta", d.receitaBruta, da("receitaBruta"), 1, ["receitaBruta"]),
    lDre("(-) Deduções da Receita", -d.deducoes, dAnt ? -dAnt.deducoes : null, 2, ["deducoes"]),
    lDre("Receita Líquida", d.receitaLiquida, da("receitaLiquida"), 0),
    lDre("(-) Custo das Mercadorias Vendidas", -d.cmv, dAnt ? -dAnt.cmv : null, 2, ["cmv"]),
    lDre("Lucro Bruto", d.lucroBruto, da("lucroBruto"), 0),
    lDre("(-) Despesas com Vendas", -d.despesasVendas, dAnt ? -dAnt.despesasVendas : null, 2, ["despesasVendas"]),
    lDre("(-) Despesas Gerais e Administrativas", -d.despesasAdministrativas, dAnt ? -dAnt.despesasAdministrativas : null, 2, ["despesasAdministrativas"]),
    lDre("(-) Despesas Tributárias", -d.despesasTributarias, dAnt ? -dAnt.despesasTributarias : null, 2, ["despesasTributarias"]),
    lDre("(-) Depreciação e Amortização (destacada)", -d.depreciacaoAmortizacao, dAnt ? -dAnt.depreciacaoAmortizacao : null, 2, ["depreciacaoAmortizacao"]),
    lDre("(+) Outras Receitas Operacionais", d.outrasReceitasOperacionais, da("outrasReceitasOperacionais"), 2, ["outrasReceitasOperacionais"]),
    lDre("(-) Outras Despesas Operacionais", -d.outrasDespesasOperacionais, dAnt ? -dAnt.outrasDespesasOperacionais : null, 2, ["outrasDespesasOperacionais"]),
    lDre("(+/-) Equivalência Patrimonial", d.equivalenciaPatrimonial, da("equivalenciaPatrimonial"), 2, ["equivalenciaPatrimonial"]),
    lDre("EBIT (Lucro Antes do Resultado Financeiro)", d.ebit, da("ebit"), 0),
    lDre("(+) Receitas Financeiras", d.receitasFinanceiras, da("receitasFinanceiras"), 2, ["receitasFinanceiras"]),
    lDre("(-) Despesas Financeiras", -d.despesasFinanceiras, dAnt ? -dAnt.despesasFinanceiras : null, 2, ["despesasFinanceiras"]),
    lDre("(+/-) Variação Cambial e Monetária Líquida", d.variacaoCambialLiquida, da("variacaoCambialLiquida"), 2, ["variacaoCambialLiquida"]),
    lDre("Resultado Financeiro", d.resultadoFinanceiro, da("resultadoFinanceiro"), 1),
    lDre("(+/-) Resultado Não Operacional", d.resultadoNaoOperacional, da("resultadoNaoOperacional"), 2, ["resultadoNaoOperacional"]),
    lDre("Resultado Antes do IR e CSLL", d.lair, da("lair"), 0),
    lDre("(-) IRPJ e CSLL", -d.irCs, dAnt ? -dAnt.irCs : null, 2, ["irCs"]),
    lDre("(-) Participações", -d.participacoes, dAnt ? -dAnt.participacoes : null, 2, ["participacoes"]),
    lDre("Lucro Líquido do Período", d.lucroLiquido, da("lucroLiquido"), 0),
    ...(d.irComplementar > 0
      ? [
          lDre(`(-) IR/CSLL complementar estimado (${pct(ALIQUOTA_IR_CS, 0)} do LAIR)`, -d.irComplementar, null, 2),
          lDre("Lucro Líquido Ajustado (provisão de IR/CSLL completa)", d.lucroAjustado, null, 0),
        ]
      : []),
    lDre(d.depreciacaoEstimada ? "EBITDA ajustado (D&A estimada pelo balanço)" : "EBITDA ajustado", d.ebitda, da("ebitda"), 1),
  ].filter((l) => l.nivel !== 2 || l.valor !== 0 || (l.anterior ?? 0) !== 0);

  // ---------------------------------------------------------------------- DFC
  const dfc = balAnt && ta && periodo.mensal ? fluxoDeCaixa(b, balAnt, t, ta, d) : null;

  // --------------------------------------------------------------- Indicadores
  const ind = (i: Omit<Indicador, "anterior"> & { anterior?: number | null }): Indicador => ({ anterior: null, ...i });
  const media = (atual: number, anterior: number | null | undefined) => (anterior === null || anterior === undefined ? atual : (atual + anterior) / 2);
  const anual = (x: number | null) => (x === null ? null : (x * 12) / meses);

  // Capital de giro (Fleuriet)
  const ccl = t.ac - t.pc;
  const ncg = t.ativoOperacional - t.passivoOperacional;
  const st = ccl - ncg;
  const cclAnt = ta ? ta.ac - ta.pc : null;
  const ncgAnt = ta ? ta.ativoOperacional - ta.passivoOperacional : null;
  const stAnt = cclAnt !== null && ncgAnt !== null ? cclAnt - ncgAnt : null;

  // Prazos medios (dias do periodo; compras = CMV + estoque final - estoque inicial)
  const dias = periodo.dias;
  const compras = balAnt ? d.cmv + b.estoques - balAnt.estoques : d.cmv;
  const recebiveis = b.clientes + b.clientesPartesRelacionadas;
  const pmr = div(recebiveis * dias, d.receitaBruta);
  const pme = div(b.estoques * dias, d.cmv);
  const pmp = div(b.fornecedores * dias, compras);
  const cicloOp = pmr !== null && pme !== null ? pmr + pme : null;
  const cicloFin = cicloOp !== null && pmp !== null ? cicloOp - pmp : null;

  const fleuriet = tipoFleuriet(ccl, ncg, st);

  const capitalGiro: Indicador[] = [
    ind({
      chave: "ncg",
      titulo: "Necessidade de Capital de Giro (NCG)",
      valor: ncg,
      anterior: ncgAnt,
      formato: "moeda",
      oQueE:
        "Quanto dinheiro a operação prende no dia a dia: o que a empresa tem a receber de clientes, em estoque e adiantado a fornecedores, menos o que a própria operação financia (fornecedores, impostos, salários e adiantamentos de clientes). NCG positiva precisa ser financiada por capital próprio, dívida de longo prazo ou por empréstimos de curto prazo.",
      formula: "NCG = Ativo Operacional (cíclico) − Passivo Operacional (cíclico)",
      componentes: [
        { rotulo: "Contas a receber de clientes", valor: b.clientes, campos: ["clientes"], sinal: "+" },
        { rotulo: "Contas a receber de coligadas", valor: b.clientesPartesRelacionadas, campos: ["clientesPartesRelacionadas"], sinal: "+" },
        { rotulo: "Estoques", valor: b.estoques, campos: ["estoques"], sinal: "+" },
        { rotulo: "Adiantamento a fornecedores", valor: b.adiantamentoFornecedores, campos: ["adiantamentoFornecedores"], sinal: "+" },
        { rotulo: "Tributos a recuperar", valor: b.tributosRecuperar, campos: ["tributosRecuperar"], sinal: "+" },
        { rotulo: "Outros ativos operacionais", valor: b.outrosAtivosOperacionaisCirc, campos: ["outrosAtivosOperacionaisCirc"], sinal: "+" },
        { rotulo: "= Ativo operacional", valor: t.ativoOperacional },
        { rotulo: "Fornecedores", valor: b.fornecedores, campos: ["fornecedores"], sinal: "-" },
        { rotulo: "Salários e encargos", valor: b.salariosEncargos, campos: ["salariosEncargos"], sinal: "-" },
        { rotulo: "Impostos a recolher", valor: b.impostosRecolher, campos: ["impostosRecolher"], sinal: "-" },
        { rotulo: "IRPJ e CSLL a recolher", valor: b.irCsRecolher, campos: ["irCsRecolher"], sinal: "-" },
        { rotulo: "Adiantamentos de clientes", valor: b.adiantamentosClientes, campos: ["adiantamentosClientes"], sinal: "-" },
        { rotulo: "Outros passivos circulantes", valor: b.outrosPassivosCirc, campos: ["outrosPassivosCirc"], sinal: "-" },
        { rotulo: "= Passivo operacional", valor: t.passivoOperacional },
      ].filter((c) => c.valor !== 0),
      leitura:
        ncg > 0
          ? `A operação consome ${brl(ncg)} de capital de giro${ncgAnt !== null ? ` (${ncg > ncgAnt ? "aumento" : "redução"} de ${brl(Math.abs(ncg - ncgAnt))} no mês)` : ""}. ${st < 0 ? `Como o saldo de tesouraria é negativo, parte dessa necessidade está sendo coberta por dívida de curto prazo (ACC/empréstimos).` : "O capital circulante líquido cobre essa necessidade."}`
          : `A operação gera recursos: os passivos operacionais (${brl(t.passivoOperacional)}) superam os ativos operacionais (${brl(t.ativoOperacional)}), ou seja, fornecedores e clientes financiam o giro.`,
      tom: ncg <= 0 ? "bom" : st >= 0 ? "bom" : "atencao",
    }),
    ind({
      chave: "ccl",
      titulo: "Capital Circulante Líquido (CCL)",
      valor: ccl,
      anterior: cclAnt,
      formato: "moeda",
      oQueE:
        "Folga financeira de curto prazo: quanto do ativo circulante sobra depois de pagar todo o passivo circulante. No modelo Fleuriet, é a parcela de recursos de longo prazo (capital próprio e dívidas longas) que financia o giro.",
      formula: "CCL = Ativo Circulante − Passivo Circulante",
      componentes: [
        { rotulo: "Ativo circulante", valor: t.ac, sinal: "+" },
        { rotulo: "Passivo circulante", valor: t.pc, sinal: "-" },
      ],
      leitura:
        ccl >= 0
          ? `Há ${brl(ccl)} de recursos de longo prazo financiando o circulante.`
          : `O passivo circulante supera o ativo circulante em ${brl(-ccl)}: recursos de curto prazo estão financiando ativos de longo prazo (imobilizado, mútuos, investimentos).`,
      tom: ccl >= 0 ? "bom" : "ruim",
    }),
    ind({
      chave: "saldoTesouraria",
      titulo: "Saldo de Tesouraria (T)",
      valor: st,
      anterior: stAnt,
      formato: "moeda",
      oQueE:
        "Diferença entre os ativos financeiros de curto prazo (caixa, aplicações, hedge, créditos não operacionais) e os passivos financeiros de curto prazo (empréstimos, ACC, mútuos, dividendos). Negativo indica que a empresa depende de crédito bancário de curto prazo para girar.",
      formula: "T = Ativo Errático (financeiro) − Passivo Errático (oneroso) = CCL − NCG",
      componentes: [
        { rotulo: "Caixa e bancos", valor: b.caixa, campos: ["caixa"], sinal: "+" },
        { rotulo: "Aplicações financeiras", valor: b.aplicacoesFinanceiras, campos: ["aplicacoesFinanceiras"], sinal: "+" },
        { rotulo: "Hedge e derivativos", valor: b.derivativosHedge, campos: ["derivativosHedge"], sinal: "+" },
        { rotulo: "Outros ativos não operacionais", valor: b.outrosAtivosNaoOperacionaisCirc, campos: ["outrosAtivosNaoOperacionaisCirc"], sinal: "+" },
        { rotulo: "Empréstimos e financiamentos CP", valor: b.emprestimosCP, campos: ["emprestimosCP"], sinal: "-" },
        { rotulo: "ACC / ACE", valor: b.accAce, campos: ["accAce"], sinal: "-" },
        { rotulo: "Derivativos e hedge a pagar", valor: b.derivativosPassivo, campos: ["derivativosPassivo"], sinal: "-" },
        { rotulo: "Empréstimos de sócios/coligadas CP", valor: b.partesRelacionadasCP, campos: ["partesRelacionadasCP"], sinal: "-" },
        { rotulo: "Dividendos a pagar", valor: b.dividendosPagar, campos: ["dividendosPagar"], sinal: "-" },
      ].filter((c) => c.valor !== 0),
      leitura:
        st >= 0
          ? `Tesouraria positiva em ${brl(st)}: o caixa e as aplicações superam a dívida de curto prazo.`
          : `Tesouraria negativa em ${brl(-st)}: a dívida de curto prazo (ACC e empréstimos) supera o caixa. ${st < (stAnt ?? st) ? "O buraco aumentou no mês - efeito tesoura se a NCG crescer mais rápido que o CCL." : "Houve melhora em relação ao mês anterior."}`,
      tom: st >= 0 ? "bom" : st < -Math.abs(ncg) ? "ruim" : "atencao",
    }),
    ind({
      chave: "fleuriet",
      titulo: "Situação Financeira (Modelo Fleuriet)",
      valor: null,
      valorTexto: fleuriet.tipo,
      formato: "texto",
      oQueE:
        "Classificação da estrutura financeira pela combinação dos sinais de CCL, NCG e Saldo de Tesouraria. Vai de Excelente (Tipo I) a Alto Risco (Tipo VI) e é usada por bancos para avaliar a saúde do giro.",
      formula: "Sinais de CCL, NCG e T",
      componentes: [
        { rotulo: "CCL", valor: ccl },
        { rotulo: "NCG", valor: ncg },
        { rotulo: "Saldo de tesouraria", valor: st },
      ],
      leitura: fleuriet.leitura,
      tom: fleuriet.tom,
    }),
    ind({
      chave: "pmr",
      titulo: "Prazo Médio de Recebimento (PMR)",
      valor: pmr,
      formato: "dias",
      oQueE: "Em quantos dias, em média, a empresa recebe suas vendas. Quanto maior, mais capital fica preso em clientes.",
      formula: `PMR = Contas a Receber ÷ Receita Bruta do período × ${dias} dias`,
      componentes: [
        { rotulo: "Contas a receber (clientes + coligadas)", valor: recebiveis, campos: ["clientes", "clientesPartesRelacionadas"] },
        { rotulo: `Receita bruta (${periodo.descricao})`, valor: d.receitaBruta, campos: ["receitaBruta"] },
        { rotulo: "Dias do período", valor: dias, formato: "texto" },
      ],
      leitura: pmr === null ? "Sem receita no período." : `A empresa leva ${num(pmr, 0)} dias para receber suas vendas.`,
      tom: "neutro",
    }),
    ind({
      chave: "pme",
      titulo: "Prazo Médio de Estocagem (PME)",
      valor: pme,
      formato: "dias",
      oQueE: "Quantos dias o estoque leva, em média, para ser vendido. Em exportadora de café, sobe na safra e com embarques programados.",
      formula: `PME = Estoques ÷ CMV do período × ${dias} dias`,
      componentes: [
        { rotulo: "Estoques", valor: b.estoques, campos: ["estoques"] },
        { rotulo: `CMV (${periodo.descricao})`, valor: d.cmv, campos: ["cmv"] },
        { rotulo: "Dias do período", valor: dias, formato: "texto" },
      ],
      leitura: pme === null ? "Sem CMV no período." : `O estoque atual equivale a ${num(pme, 0)} dias de custo de vendas.`,
      tom: "neutro",
    }),
    ind({
      chave: "pmp",
      titulo: "Prazo Médio de Pagamento (PMP)",
      valor: pmp,
      formato: "dias",
      oQueE: "Em quantos dias a empresa paga seus fornecedores. Quanto maior, mais a compra é financiada pelo próprio fornecedor.",
      formula: `PMP = Fornecedores ÷ Compras do período × ${dias} dias, com Compras = CMV + Estoque final − Estoque inicial`,
      componentes: [
        { rotulo: "Fornecedores", valor: b.fornecedores, campos: ["fornecedores"] },
        { rotulo: "CMV", valor: d.cmv, campos: ["cmv"] },
        { rotulo: "Estoque final", valor: b.estoques, campos: ["estoques"] },
        { rotulo: "Estoque inicial", valor: balAnt ? balAnt.estoques : null },
        { rotulo: "= Compras do período", valor: compras },
      ],
      leitura: pmp === null ? "Sem compras no período." : `A empresa paga fornecedores em ${num(pmp, 0)} dias.${balAnt ? "" : " Sem balanço anterior, usou-se o CMV como compras."}`,
      tom: "neutro",
    }),
    ind({
      chave: "cicloFinanceiro",
      titulo: "Ciclo Financeiro (Ciclo de Caixa)",
      valor: cicloFin,
      formato: "dias",
      oQueE:
        "Número de dias entre pagar o fornecedor e receber do cliente - o tempo que a empresa precisa financiar a operação com recursos próprios ou bancários. Ciclo operacional = PMR + PME.",
      formula: "Ciclo Financeiro = PMR + PME − PMP",
      componentes: [
        { rotulo: "PMR", valor: pmr, formato: "dias", sinal: "+" },
        { rotulo: "PME", valor: pme, formato: "dias", sinal: "+" },
        { rotulo: "PMP", valor: pmp, formato: "dias", sinal: "-" },
        { rotulo: "Ciclo operacional (PMR + PME)", valor: cicloOp, formato: "dias" },
      ],
      leitura:
        cicloFin === null
          ? "Não calculado."
          : cicloFin > 0
            ? `A empresa financia ${num(cicloFin, 0)} dias de operação entre pagar e receber - é isso que gera a NCG e a necessidade de ACC.`
            : `Ciclo negativo: a empresa recebe antes de pagar, os fornecedores financiam a operação.`,
      tom: cicloFin === null ? "neutro" : cicloFin <= 30 ? "bom" : cicloFin <= 60 ? "atencao" : "ruim",
    }),
  ];

  // Liquidez
  const liqImediata = div(t.caixaDisponivel, t.pc);
  const liqCorrente = div(t.ac, t.pc);
  const liqSeca = div(t.ac - b.estoques, t.pc);
  const liqGeral = div(t.ac + t.rlp, t.pc + t.pnc);
  const liquidez: Indicador[] = [
    ind({
      chave: "liquidezCorrente",
      titulo: "Liquidez Corrente",
      valor: liqCorrente,
      anterior: ta ? div(ta.ac, ta.pc) : null,
      formato: "vezes",
      oQueE: "Quanto a empresa tem de bens e direitos de curto prazo para cada R$ 1,00 de dívida de curto prazo.",
      formula: "Liquidez Corrente = Ativo Circulante ÷ Passivo Circulante",
      componentes: [
        { rotulo: "Ativo circulante", valor: t.ac },
        { rotulo: "Passivo circulante", valor: t.pc },
      ],
      leitura: liqCorrente === null ? "-" : `Para cada R$ 1,00 de obrigações de curto prazo há R$ ${num(liqCorrente)} no ativo circulante. ${liqCorrente >= 1.2 ? "Folga confortável." : liqCorrente >= 1 ? "Cobre as obrigações, mas com pouca folga." : "Não cobre as obrigações de curto prazo."}`,
      tom: liqCorrente === null ? "neutro" : liqCorrente >= 1.2 ? "bom" : liqCorrente >= 1 ? "atencao" : "ruim",
    }),
    ind({
      chave: "liquidezSeca",
      titulo: "Liquidez Seca",
      valor: liqSeca,
      anterior: ta && balAnt ? div(ta.ac - balAnt.estoques, ta.pc) : null,
      formato: "vezes",
      oQueE: "Mesma lógica da liquidez corrente, mas sem os estoques - mostra a capacidade de pagamento sem depender de vender o estoque.",
      formula: "Liquidez Seca = (Ativo Circulante − Estoques) ÷ Passivo Circulante",
      componentes: [
        { rotulo: "Ativo circulante", valor: t.ac, sinal: "+" },
        { rotulo: "Estoques", valor: b.estoques, campos: ["estoques"], sinal: "-" },
        { rotulo: "Passivo circulante", valor: t.pc },
      ],
      leitura: liqSeca === null ? "-" : `Sem vender estoque, a empresa cobre ${pct(liqSeca, 0)} das dívidas de curto prazo. Em exportadora de café o estoque é líquido (commodity com hedge), então este índice tende a ser menor sem indicar problema.`,
      tom: liqSeca === null ? "neutro" : liqSeca >= 1 ? "bom" : liqSeca >= 0.7 ? "atencao" : "ruim",
    }),
    ind({
      chave: "liquidezImediata",
      titulo: "Liquidez Imediata",
      valor: liqImediata,
      anterior: ta ? div(ta.caixaDisponivel, ta.pc) : null,
      formato: "vezes",
      oQueE: "Quanto do passivo circulante poderia ser pago hoje só com caixa e aplicações de liquidez imediata.",
      formula: "Liquidez Imediata = (Caixa + Aplicações) ÷ Passivo Circulante",
      componentes: [
        { rotulo: "Caixa e bancos", valor: b.caixa, campos: ["caixa"], sinal: "+" },
        { rotulo: "Aplicações financeiras", valor: b.aplicacoesFinanceiras, campos: ["aplicacoesFinanceiras"], sinal: "+" },
        { rotulo: "Passivo circulante", valor: t.pc },
      ],
      leitura: liqImediata === null ? "-" : `O caixa disponível cobre ${pct(liqImediata, 0)} do passivo circulante.`,
      tom: liqImediata === null ? "neutro" : liqImediata >= 0.2 ? "bom" : liqImediata >= 0.05 ? "atencao" : "ruim",
    }),
    ind({
      chave: "liquidezGeral",
      titulo: "Liquidez Geral",
      valor: liqGeral,
      anterior: ta ? div(ta.ac + ta.rlp, ta.pc + ta.pnc) : null,
      formato: "vezes",
      oQueE: "Capacidade de pagar todas as dívidas (curto e longo prazo) com tudo o que é realizável (circulante + realizável a longo prazo).",
      formula: "Liquidez Geral = (Ativo Circulante + Realizável a LP) ÷ (Passivo Circulante + Passivo Não Circulante)",
      componentes: [
        { rotulo: "Ativo circulante", valor: t.ac, sinal: "+" },
        { rotulo: "Realizável a longo prazo", valor: t.rlp, sinal: "+" },
        { rotulo: "Passivo circulante", valor: t.pc, sinal: "+" },
        { rotulo: "Passivo não circulante", valor: t.pnc, sinal: "+" },
      ],
      leitura: liqGeral === null ? "-" : `Para cada R$ 1,00 de dívida total há R$ ${num(liqGeral)} realizáveis.`,
      tom: liqGeral === null ? "neutro" : liqGeral >= 1 ? "bom" : liqGeral >= 0.9 ? "atencao" : "ruim",
    }),
  ];

  // Estrutura e endividamento
  const exigivel = t.pc + t.pnc;
  const endivGeral = div(exigivel, t.at);
  const capTerceiros = div(exigivel, t.pl);
  const composicao = div(t.pc, exigivel);
  const imobPl = div(t.anc - t.rlp, t.pl);
  const dlEbitda = ebitdaAnual > 0 ? t.dividaLiquida / ebitdaAnual : null;
  const coberturaJuros = div(d.ebitda, d.despesasFinanceiras);
  const varDivida = ta ? div(t.dividaBancaria - ta.dividaBancaria, ta.dividaBancaria) : null;
  const dlPl = t.pl > 0 ? t.dividaLiquida / t.pl : null;
  const imobRnc = div(t.anc - t.rlp, t.pl + t.pnc);
  const dividaMedia = media(t.dividaBruta, ta?.dividaBruta);
  const custoDivida = dividaMedia > 0 ? (d.despesasFinanceiras * 12) / meses / dividaMedia : null;
  const capInvMedio = media(t.dividaBruta + t.pl, ta ? ta.dividaBruta + ta.pl : null);
  const roicAnual = capInvMedio > 0 ? anual((d.ebit * (1 - ALIQUOTA_IR_CS)) / capInvMedio) : null;
  const estrutura: Indicador[] = [
    ind({
      chave: "dividaLiquidaEbitda",
      titulo: "Dívida Líquida / EBITDA",
      valor: dlEbitda,
      formato: "vezes",
      oQueE:
        "Principal indicador de crédito: em quantos anos a geração de caixa operacional (EBITDA) pagaria a dívida líquida. Bancos costumam aceitar até 2,5x-3x.",
      formula: `Dívida Líquida ÷ EBITDA ${ltm !== null ? "dos últimos 12 meses" : "anualizado (período × 12 ÷ meses)"}`,
      componentes: [
        { rotulo: "Empréstimos e financiamentos CP", valor: b.emprestimosCP, campos: ["emprestimosCP"], sinal: "+" },
        { rotulo: "ACC / ACE", valor: b.accAce, campos: ["accAce"], sinal: "+" },
        { rotulo: "Empréstimos LP", valor: b.emprestimosLP, campos: ["emprestimosLP"], sinal: "+" },
        { rotulo: "Mútuos de sócios/coligadas", valor: b.partesRelacionadasCP + b.partesRelacionadasLP, campos: ["partesRelacionadasCP", "partesRelacionadasLP"], sinal: "+" },
        { rotulo: "Caixa e aplicações", valor: t.caixaDisponivel, campos: ["caixa", "aplicacoesFinanceiras"], sinal: "-" },
        { rotulo: "= Dívida líquida", valor: t.dividaLiquida },
        { rotulo: ltm !== null ? "EBITDA 12 meses" : "EBITDA anualizado", valor: ebitdaAnual },
      ].filter((c) => c.valor !== 0),
      leitura:
        dlEbitda === null
          ? `EBITDA ${ebitdaAnual <= 0 ? "negativo ou nulo" : ""} - a dívida líquida de ${brl(t.dividaLiquida)} não é coberta pela geração operacional.`
          : `A dívida líquida de ${brl(t.dividaLiquida)} equivale a ${num(dlEbitda)} anos de EBITDA. ${dlEbitda <= 2.5 ? "Nível saudável." : dlEbitda <= 3.5 ? "Alavancagem elevada - atenção." : "Alavancagem acima do aceito pelos bancos."} Em exportadoras, boa parte é ACC lastreado em embarques, que se liquida com a própria exportação.${ltm === null ? " Base anualizada de um único período: varia com a sazonalidade da safra." : ""}`,
      tom: dlEbitda === null ? (t.dividaLiquida <= 0 ? "bom" : "ruim") : dlEbitda <= 2.5 ? "bom" : dlEbitda <= 3.5 ? "atencao" : "ruim",
    }),
    ind({
      chave: "coberturaJuros",
      titulo: "Cobertura de Juros (EBITDA / Despesas Financeiras)",
      valor: coberturaJuros,
      formato: "vezes",
      oQueE: "Quantas vezes a geração operacional do período cobre as despesas financeiras (juros, encargos de ACC e empréstimos).",
      formula: "EBITDA ÷ Despesas Financeiras",
      componentes: [
        { rotulo: "EBITDA", valor: d.ebitda },
        { rotulo: "Despesas financeiras", valor: d.despesasFinanceiras, campos: ["despesasFinanceiras"] },
      ],
      leitura: coberturaJuros === null ? "Sem despesas financeiras no período." : `O EBITDA cobre ${num(coberturaJuros)} vezes os juros do período.`,
      tom: coberturaJuros === null ? "neutro" : coberturaJuros >= 3 ? "bom" : coberturaJuros >= 1.5 ? "atencao" : "ruim",
    }),
    ind({
      chave: "custoDivida",
      titulo: "Custo Médio da Dívida",
      valor: custoDivida,
      formato: "pct",
      oQueE:
        "Taxa anual implícita paga sobre a dívida onerosa (empréstimos, ACC e mútuos): despesas financeiras anualizadas sobre a dívida média. Não inclui variação cambial. Compare com o ROIC: se a dívida custar mais do que a operação rende, crescer com crédito destrói valor.",
      formula: "Despesas Financeiras × 12 ÷ Dívida Onerosa Média",
      componentes: [
        { rotulo: "Despesas financeiras do período", valor: d.despesasFinanceiras, campos: ["despesasFinanceiras"] },
        { rotulo: "Despesas financeiras anualizadas", valor: (d.despesasFinanceiras * 12) / meses },
        { rotulo: "Dívida onerosa final", valor: t.dividaBruta },
        { rotulo: "Dívida onerosa inicial", valor: ta?.dividaBruta ?? null },
        { rotulo: "= Dívida onerosa média", valor: dividaMedia },
        { rotulo: "ROIC anualizado (para comparar)", valor: roicAnual, formato: "pct" },
      ],
      leitura:
        custoDivida === null
          ? "Sem dívida onerosa."
          : `A dívida custa cerca de ${pct(custoDivida)} ao ano (juros, encargos de ACC, IOF e tarifas lançados em despesas financeiras)${roicAnual !== null ? `, contra ROIC de ${pct(roicAnual)} ao ano: ${roicAnual > custoDivida ? "a operação rende mais que o custo da dívida" : "a dívida custa mais do que a operação rende"}` : ""}. ACC em dólar tem juros baixos, mas carrega risco cambial fora desta taxa.`,
      tom: custoDivida === null ? "neutro" : roicAnual !== null && roicAnual > custoDivida ? "bom" : custoDivida <= 0.2 ? "atencao" : "ruim",
    }),
    ind({
      chave: "dividaLiquidaPl",
      titulo: "Dívida Líquida / Patrimônio Líquido",
      valor: dlPl,
      anterior: ta && ta.pl > 0 ? ta.dividaLiquida / ta.pl : null,
      formato: "vezes",
      oQueE: "Quanto de dívida onerosa líquida existe para cada R$ 1,00 de capital próprio - alavancagem financeira do balanço.",
      formula: "Dívida Líquida ÷ Patrimônio Líquido",
      componentes: [
        { rotulo: "Dívida líquida", valor: t.dividaLiquida },
        { rotulo: "Patrimônio líquido", valor: t.pl },
      ],
      leitura: dlPl === null ? "Patrimônio líquido negativo ou nulo." : `Para cada R$ 1,00 de capital próprio há R$ ${num(dlPl)} de dívida líquida.`,
      tom: dlPl === null ? "ruim" : dlPl <= 1 ? "bom" : dlPl <= 3 ? "atencao" : "ruim",
    }),
    ind({
      chave: "endividamentoGeral",
      titulo: "Endividamento Geral",
      valor: endivGeral,
      anterior: ta ? div(ta.pc + ta.pnc, ta.at) : null,
      formato: "pct",
      oQueE: "Quanto do ativo total é financiado por capital de terceiros (todas as dívidas e obrigações).",
      formula: "(Passivo Circulante + Passivo Não Circulante) ÷ Ativo Total",
      componentes: [
        { rotulo: "Passivo circulante + não circulante", valor: exigivel },
        { rotulo: "Ativo total", valor: t.at },
      ],
      leitura: endivGeral === null ? "-" : `${pct(endivGeral)} do ativo é financiado por terceiros e ${pct(1 - endivGeral)} por capital próprio.`,
      tom: endivGeral === null ? "neutro" : endivGeral <= 0.6 ? "bom" : endivGeral <= 0.85 ? "atencao" : "ruim",
    }),
    ind({
      chave: "capitalTerceiros",
      titulo: "Participação de Capital de Terceiros",
      valor: capTerceiros,
      anterior: ta ? div(ta.pc + ta.pnc, ta.pl) : null,
      formato: "vezes",
      oQueE: "Quanto a empresa deve a terceiros para cada R$ 1,00 de capital próprio (grau de alavancagem do balanço).",
      formula: "(Passivo Circulante + Passivo Não Circulante) ÷ Patrimônio Líquido",
      componentes: [
        { rotulo: "Capital de terceiros", valor: exigivel },
        { rotulo: "Patrimônio líquido", valor: t.pl },
      ],
      leitura: capTerceiros === null ? "-" : t.pl <= 0 ? "Patrimônio líquido negativo (passivo a descoberto)." : `Para cada R$ 1,00 de capital próprio a empresa deve R$ ${num(capTerceiros)} a terceiros.`,
      tom: capTerceiros === null || t.pl <= 0 ? "ruim" : capTerceiros <= 2 ? "bom" : capTerceiros <= 5 ? "atencao" : "ruim",
    }),
    ind({
      chave: "composicaoEndividamento",
      titulo: "Composição do Endividamento",
      valor: composicao,
      anterior: ta ? div(ta.pc, ta.pc + ta.pnc) : null,
      formato: "pct",
      oQueE: "Quanto das dívidas vence no curto prazo (até 12 meses). Concentração alta exige renovação constante das linhas.",
      formula: "Passivo Circulante ÷ (Passivo Circulante + Passivo Não Circulante)",
      componentes: [
        { rotulo: "Passivo circulante", valor: t.pc },
        { rotulo: "Capital de terceiros total", valor: exigivel },
      ],
      leitura: composicao === null ? "-" : `${pct(composicao)} das obrigações vencem em até 12 meses.`,
      tom: composicao === null ? "neutro" : composicao <= 0.6 ? "bom" : composicao <= 0.9 ? "atencao" : "ruim",
    }),
    ind({
      chave: "imobilizacaoPl",
      titulo: "Imobilização do Patrimônio Líquido",
      valor: imobPl,
      anterior: ta ? div(ta.anc - ta.rlp, ta.pl) : null,
      formato: "pct",
      oQueE: "Quanto do capital próprio está aplicado em ativos permanentes (investimentos, imobilizado e intangível) e não disponível para o giro.",
      formula: "(Investimentos + Imobilizado Líquido + Intangível) ÷ Patrimônio Líquido",
      componentes: [
        { rotulo: "Investimentos", valor: b.investimentos, campos: ["investimentos"], sinal: "+" },
        { rotulo: "Imobilizado líquido", valor: t.imobilizadoLiquido, campos: ["imobilizadoBruto", "depreciacaoAcumulada"], sinal: "+" },
        { rotulo: "Intangível", valor: b.intangivel, campos: ["intangivel"], sinal: "+" },
        { rotulo: "Patrimônio líquido", valor: t.pl },
      ].filter((c) => c.valor !== 0),
      leitura: imobPl === null ? "-" : `${pct(imobPl)} do PL está imobilizado; o restante financia o capital de giro.`,
      tom: imobPl === null ? "neutro" : imobPl <= 0.5 ? "bom" : imobPl <= 1 ? "atencao" : "ruim",
    }),
    ind({
      chave: "imobilizacaoRecursosNaoCorrentes",
      titulo: "Imobilização dos Recursos Não Correntes",
      valor: imobRnc,
      anterior: ta ? div(ta.anc - ta.rlp, ta.pl + ta.pnc) : null,
      formato: "pct",
      oQueE: "Quanto dos recursos de longo prazo (PL + passivo não circulante) está aplicado em ativos permanentes. Acima de 100%, ativos permanentes estão sendo financiados com dívida de curto prazo.",
      formula: "(Investimentos + Imobilizado Líquido + Intangível) ÷ (Patrimônio Líquido + Passivo Não Circulante)",
      componentes: [
        { rotulo: "Ativo permanente", valor: t.anc - t.rlp },
        { rotulo: "Patrimônio líquido", valor: t.pl, sinal: "+" },
        { rotulo: "Passivo não circulante", valor: t.pnc, sinal: "+" },
      ],
      leitura: imobRnc === null ? "-" : `${pct(imobRnc)} dos recursos de longo prazo estão em ativos permanentes.`,
      tom: imobRnc === null ? "neutro" : imobRnc <= 0.7 ? "bom" : imobRnc <= 1 ? "atencao" : "ruim",
    }),
    ind({
      chave: "dividaFinanceiraExigivel",
      titulo: "Participação da Dívida Financeira no Exigível",
      valor: div(t.dividaBruta, exigivel),
      anterior: ta ? div(ta.dividaBruta, ta.pc + ta.pnc) : null,
      formato: "pct",
      oQueE: "Quanto das obrigações totais é dívida que paga juros (bancos, ACC, mútuos), em oposição a obrigações operacionais (fornecedores, impostos).",
      formula: "Dívida Financeira Bruta ÷ (Passivo Circulante + Passivo Não Circulante)",
      componentes: [
        { rotulo: "Dívida financeira bruta", valor: t.dividaBruta, campos: ["emprestimosCP", "accAce", "emprestimosLP", "partesRelacionadasCP", "partesRelacionadasLP"] },
        { rotulo: "Capital de terceiros total", valor: exigivel },
      ],
      leitura: `${pct(div(t.dividaBruta, exigivel) ?? 0)} do exigível é dívida onerosa, sendo ${brl(b.accAce)} em ACC/ACE.`,
      tom: "neutro",
    }),
    ind({
      chave: "variacaoDivida",
      titulo: "Variação da Dívida Bancária no Mês",
      valor: varDivida,
      formato: "pct",
      oQueE: "Quanto a dívida bancária (empréstimos + ACC + longo prazo) cresceu ou caiu em relação ao balanço anterior.",
      formula: "(Dívida bancária atual ÷ Dívida bancária anterior) − 1",
      componentes: [
        { rotulo: "Dívida bancária atual", valor: t.dividaBancaria },
        { rotulo: "Dívida bancária anterior", valor: ta?.dividaBancaria ?? null },
      ],
      leitura: varDivida === null ? "Sem balanço anterior." : `A dívida bancária ${varDivida >= 0 ? "aumentou" : "diminuiu"} ${pct(Math.abs(varDivida))} (${brl(t.dividaBancaria - (ta?.dividaBancaria ?? 0))}).`,
      tom: varDivida === null ? "neutro" : varDivida <= 0 ? "bom" : varDivida <= 0.1 ? "atencao" : "ruim",
    }),
  ];

  // Rentabilidade
  const mBruta = div(d.lucroBruto, rl);
  const mEbitda = div(d.ebitda, rl);
  const mLiq = div(d.lucroLiquido, rl);
  // Retornos sobre saldos medios do periodo ((inicial + final) / 2), pratica
  // padrao de analise: o lucro e gerado ao longo do mes, nao so no saldo final.
  const plMedio = media(t.pl, ta?.pl);
  const atMedio = media(t.at, ta?.at);
  const capitalInvestido = media(t.dividaBruta + t.pl, ta ? ta.dividaBruta + ta.pl : null);
  const baseMedia = ta ? "médio (início + fim) ÷ 2" : "final (sem balanço anterior)";
  const roe = plMedio > 0 ? d.lucroLiquido / plMedio : null;
  const roa = div(d.lucroLiquido, atMedio);
  // NOPAT: resultado operacional depois do IR/CSLL teorico de 34%.
  const nopat = d.ebit * (1 - ALIQUOTA_IR_CS);
  const roic = capitalInvestido > 0 ? nopat / capitalInvestido : null;
  const gaf = roe !== null && roic ? roe / roic : null;
  const giro = div(rl, atMedio);
  const evolVendas = dAnt ? div(d.receitaLiquida - dAnt.receitaLiquida, dAnt.receitaLiquida) : null;
  const rentabilidade: Indicador[] = [
    ind({
      chave: "margemBruta",
      titulo: "Margem Bruta",
      valor: mBruta,
      anterior: dAnt ? div(dAnt.lucroBruto, dAnt.receitaLiquida) : null,
      formato: "pct",
      oQueE: "Quanto sobra de cada R$ 1,00 vendido depois do custo da mercadoria. Em trading de café as margens são estreitas e dependem do diferencial e do hedge.",
      formula: "Lucro Bruto ÷ Receita Líquida",
      componentes: [
        { rotulo: "Receita líquida", valor: rl, campos: ["receitaBruta", "deducoes"] },
        { rotulo: "CMV", valor: d.cmv, campos: ["cmv"], sinal: "-" },
        { rotulo: "= Lucro bruto", valor: d.lucroBruto },
      ],
      leitura: mBruta === null ? "-" : `A margem bruta do período foi de ${pct(mBruta)}.`,
      tom: mBruta === null ? "neutro" : mBruta > 0.05 ? "bom" : mBruta > 0 ? "atencao" : "ruim",
    }),
    ind({
      chave: "margemEbitda",
      titulo: "Margem EBITDA",
      valor: mEbitda,
      anterior: dAnt ? div(dAnt.ebitda, dAnt.receitaLiquida) : null,
      formato: "pct",
      oQueE: "Geração de caixa operacional (antes de juros, variação cambial, impostos e depreciação) para cada R$ 1,00 de receita.",
      formula: "EBITDA ajustado ÷ Receita Líquida, com EBITDA = EBIT − Equivalência + Depreciação e Amortização",
      componentes: [
        { rotulo: "EBIT", valor: d.ebit },
        { rotulo: "Equivalência patrimonial", valor: d.equivalenciaPatrimonial, sinal: "-" },
        { rotulo: d.depreciacaoEstimada ? "Depreciação (estimada pela variação da depreciação acumulada)" : "Depreciação e amortização", valor: d.depreciacaoUsada, campos: d.depreciacaoEstimada ? ["depreciacaoAcumulada"] : ["depreciacaoAmortizacao"], sinal: "+" },
        { rotulo: "= EBITDA", valor: d.ebitda },
        { rotulo: "Receita líquida", valor: rl },
      ],
      leitura: mEbitda === null ? "-" : `EBITDA de ${brl(d.ebitda)}, margem de ${pct(mEbitda)}.`,
      tom: mEbitda === null ? "neutro" : mEbitda > 0.03 ? "bom" : mEbitda > 0 ? "atencao" : "ruim",
    }),
    ind({
      chave: "margemLiquida",
      titulo: "Margem Líquida (Lucratividade)",
      valor: mLiq,
      anterior: dAnt ? div(dAnt.lucroLiquido, dAnt.receitaLiquida) : null,
      formato: "pct",
      oQueE: "Quanto vira lucro final de cada R$ 1,00 de receita, depois de todos os custos, despesas, juros, variação cambial e impostos.",
      formula: "Lucro Líquido ÷ Receita Líquida",
      componentes: [
        { rotulo: "Lucro líquido", valor: d.lucroLiquido },
        { rotulo: "Receita líquida", valor: rl },
        ...(d.irComplementar > 0 ? [{ rotulo: "Margem com IR/CSLL completo", valor: div(d.lucroAjustado, rl), formato: "pct" }] : []),
      ],
      leitura:
        mLiq === null
          ? "-"
          : `${pct(mLiq)} da receita virou lucro líquido (${brl(d.lucroLiquido)}).${d.irComplementar > 0 ? ` Com a provisão de IR/CSLL completa seria ${pct(div(d.lucroAjustado, rl) ?? 0)} (${brl(d.lucroAjustado)}).` : ""}`,
      tom: mLiq === null ? "neutro" : mLiq > 0.01 ? "bom" : mLiq >= 0 ? "atencao" : "ruim",
    }),
    ind({
      chave: "roe",
      titulo: "Rentabilidade do Patrimônio Líquido (ROE)",
      valor: roe,
      formato: "pct",
      oQueE: "Retorno do período sobre o capital dos sócios. Anualizado, compare com o custo de oportunidade (CDI).",
      formula: `Lucro Líquido ÷ Patrimônio Líquido ${baseMedia}`,
      componentes: [
        { rotulo: "Lucro líquido do período", valor: d.lucroLiquido },
        { rotulo: "PL final", valor: t.pl },
        { rotulo: "PL inicial", valor: ta?.pl ?? null },
        { rotulo: "= PL médio", valor: plMedio },
        { rotulo: "ROE anualizado (× 12)", valor: anual(roe), formato: "pct" },
        ...(d.irComplementar > 0 ? [{ rotulo: "ROE com IR/CSLL completo", valor: plMedio > 0 ? d.lucroAjustado / plMedio : null, formato: "pct" }] : []),
      ],
      leitura:
        roe === null
          ? "Patrimônio líquido médio negativo ou nulo: o retorno sobre o capital próprio não tem significado (passivo a descoberto)."
          : `Retorno de ${pct(roe)} no período (${pct(anual(roe)!)} ao ano). PL pequeno em relação ao lucro do mês amplia o ROE - leia junto com o endividamento.${d.irComplementar > 0 ? ` Com a provisão de IR/CSLL completa, ${pct(d.lucroAjustado / plMedio)} no período.` : ""}`,
      tom: roe === null ? "ruim" : anual(roe)! >= 0.15 ? "bom" : roe >= 0 ? "atencao" : "ruim",
    }),
    ind({
      chave: "roa",
      titulo: "Rentabilidade do Ativo (ROA)",
      valor: roa,
      formato: "pct",
      oQueE: "Lucro gerado para cada R$ 1,00 investido no ativo total, independentemente de como foi financiado.",
      formula: `Lucro Líquido ÷ Ativo Total ${baseMedia}`,
      componentes: [
        { rotulo: "Lucro líquido do período", valor: d.lucroLiquido },
        { rotulo: "Ativo total médio", valor: atMedio },
        { rotulo: "ROA anualizado (× 12)", valor: anual(roa), formato: "pct" },
      ],
      leitura: roa === null ? "-" : `O ativo rendeu ${pct(roa)} no período (${pct(anual(roa)!)} ao ano).`,
      tom: roa === null ? "neutro" : roa > 0 ? "bom" : "ruim",
    }),
    ind({
      chave: "giroAtivo",
      titulo: "Giro do Ativo",
      valor: giro,
      formato: "vezes",
      oQueE: "Quantas vezes o ativo total \"girou\" em vendas no período - eficiência no uso dos recursos.",
      formula: `Receita Líquida ÷ Ativo Total ${baseMedia}`,
      componentes: [
        { rotulo: "Receita líquida", valor: rl },
        { rotulo: "Ativo total médio", valor: atMedio },
        { rotulo: "Giro anualizado (× 12)", valor: anual(giro), formato: "vezes" },
      ],
      leitura: giro === null ? "-" : `As vendas do período equivalem a ${num(giro)}x o ativo (${num(anual(giro)!)}x ao ano).`,
      tom: "neutro",
    }),
    ind({
      chave: "roic",
      titulo: "Retorno sobre o Capital Investido (ROIC)",
      valor: roic,
      formato: "pct",
      oQueE:
        "Retorno da operação, depois do imposto, sobre todo o capital que financia a empresa (dívida onerosa + capital próprio), sem efeito da forma de financiamento. Deve superar o custo da dívida para que tomar crédito crie valor.",
      formula: `ROIC = NOPAT ÷ (Dívida Onerosa + PL) ${baseMedia}, com NOPAT = EBIT × (1 − 34%)`,
      componentes: [
        { rotulo: "EBIT", valor: d.ebit },
        { rotulo: "IR/CSLL teórico de 34%", valor: d.ebit * ALIQUOTA_IR_CS, sinal: "-" },
        { rotulo: "= NOPAT", valor: nopat },
        { rotulo: "Capital investido médio (dívida onerosa + PL)", valor: capitalInvestido },
        { rotulo: "ROIC anualizado (× 12)", valor: anual(roic), formato: "pct" },
      ],
      leitura: roic === null ? "Capital investido negativo ou nulo." : `A operação rendeu ${pct(roic)} no período (${pct(anual(roic)!)} ao ano) sobre o capital investido.`,
      tom: roic === null ? "neutro" : anual(roic)! >= 0.15 ? "bom" : roic > 0 ? "atencao" : "ruim",
    }),
    ind({
      chave: "alavancagemFinanceira",
      titulo: "Grau de Alavancagem Financeira (GAF)",
      valor: gaf,
      formato: "vezes",
      oQueE:
        "Mostra se a dívida está trabalhando a favor do sócio: acima de 1, o retorno do PL supera o retorno do capital investido - a dívida rende mais do que custa. Abaixo de 1, juros e variação cambial consomem o resultado operacional.",
      formula: "GAF = ROE ÷ ROIC (Assaf Neto), ambos depois do IR",
      componentes: [
        { rotulo: "ROE", valor: roe, formato: "pct" },
        { rotulo: "ROIC", valor: roic, formato: "pct" },
      ],
      leitura: gaf === null ? "-" : gaf > 1 ? `GAF de ${num(gaf)}: o endividamento está ampliando o retorno dos sócios.` : `GAF de ${num(gaf)}: o custo da dívida e a variação cambial estão consumindo o resultado operacional.`,
      tom: gaf === null ? "neutro" : gaf > 1 ? "bom" : "atencao",
    }),
    ind({
      chave: "aliquotaIr",
      titulo: "Alíquota Efetiva de IRPJ e CSLL",
      valor: d.aliquotaEfetiva,
      formato: "pct",
      oQueE:
        "Quanto do lucro antes do IR foi provisionado de imposto. No lucro real a alíquota é 34% (IRPJ 15% + adicional 10% + CSLL 9%); mesmo compensando prejuízo fiscal (limitado a 30% do lucro) ela não fica abaixo de 23,8%. Provisão menor que isso superestima o lucro líquido.",
      formula: "IRPJ e CSLL provisionados ÷ Lucro Antes do IR",
      componentes: [
        { rotulo: "IRPJ e CSLL provisionados", valor: d.irCs, campos: ["irCs"] },
        { rotulo: "Lucro antes do IR e CSLL", valor: d.lair },
        { rotulo: "IR/CSLL esperado a 34%", valor: d.lair > 0 ? d.lair * ALIQUOTA_IR_CS : null },
        { rotulo: "IR/CSLL complementar estimado", valor: d.irComplementar },
        { rotulo: "= Lucro líquido ajustado", valor: d.lucroAjustado },
      ],
      leitura:
        d.aliquotaEfetiva === null
          ? "Sem lucro antes do IR no período."
          : d.irComplementar > 0
            ? `A provisão de ${brl(d.irCs)} é só ${pct(d.aliquotaEfetiva)} do lucro antes do IR - abaixo do mínimo legal de 23,8%. Provavelmente o imposto só é provisionado no fechamento trimestral/anual, ou o valor lançado é apenas compensação de IRRF. Com IR/CSLL de 34% o lucro do período seria ${brl(d.lucroAjustado)} (−${brl(d.irComplementar)}). Confirmar com a contabilidade.`
            : `Alíquota efetiva de ${pct(d.aliquotaEfetiva)}, compatível com o lucro real.`,
      tom: d.aliquotaEfetiva === null ? "neutro" : d.irComplementar > 0 ? "ruim" : "bom",
    }),
    ind({
      chave: "evolucaoVendas",
      titulo: "Evolução das Vendas Líquidas",
      valor: evolVendas,
      formato: "pct",
      oQueE: "Crescimento ou queda da receita líquida em relação ao mês anterior.",
      formula: "(Receita Líquida do mês ÷ Receita Líquida do mês anterior) − 1",
      componentes: [
        { rotulo: "Receita líquida do mês", valor: rl },
        { rotulo: "Receita líquida do mês anterior", valor: dAnt?.receitaLiquida ?? null },
      ],
      leitura: evolVendas === null ? "Mês anterior não cadastrado no sistema." : `As vendas ${evolVendas >= 0 ? "cresceram" : "caíram"} ${pct(Math.abs(evolVendas))} sobre o mês anterior.`,
      tom: evolVendas === null ? "neutro" : evolVendas >= 0 ? "bom" : "atencao",
    }),
  ];

  // Geracao de caixa (DMPL / Geracao de Recursos da planilha)
  const ffo = d.lucroLiquido + d.depreciacaoUsada - d.equivalenciaPatrimonial;
  const varNcg = ncgAnt !== null ? ncg - ncgAnt : null;
  const goc = varNcg !== null ? ffo - varNcg : null;
  const geracao: Indicador[] = [
    ind({
      chave: "ebitda",
      titulo: "EBITDA Ajustado",
      valor: d.ebitda,
      anterior: dAnt?.ebitda ?? null,
      formato: "moeda",
      oQueE:
        "Lucro operacional antes de juros, variação cambial, impostos, depreciação e amortização - aproxima o caixa gerado pela operação. É o EBITDA da Resolução CVM 156/2022 (lucro líquido + IR/CSLL + resultado financeiro + depreciação) ajustado para crédito: sem equivalência patrimonial e sem resultados não recorrentes.",
      formula: "EBITDA ajustado = EBIT − Equivalência Patrimonial + Depreciação e Amortização",
      componentes: [
        { rotulo: "Lucro bruto", valor: d.lucroBruto, sinal: "+" },
        { rotulo: "Despesas operacionais", valor: d.despesasOperacionais, sinal: "-" },
        { rotulo: "Outras receitas operacionais", valor: d.outrasReceitasOperacionais, campos: ["outrasReceitasOperacionais"], sinal: "+" },
        { rotulo: "Equivalência patrimonial", valor: d.equivalenciaPatrimonial, campos: ["equivalenciaPatrimonial"], sinal: "+" },
        { rotulo: "= EBIT", valor: d.ebit },
        { rotulo: "Equivalência patrimonial (não é caixa)", valor: d.equivalenciaPatrimonial, sinal: "-" },
        { rotulo: "Depreciação e amortização", valor: d.depreciacaoUsada, sinal: "+" },
        { rotulo: "= EBITDA ajustado", valor: d.ebitda },
      ].filter((c) => c.valor !== 0),
      leitura: `${d.ebitda >= 0 ? "Geração" : "Consumo"} operacional de ${brl(Math.abs(d.ebitda))} no período.${d.depreciacaoEstimada ? ` A DRE não destaca a depreciação; usou-se a variação da depreciação acumulada do balanço (${brl(d.depreciacaoUsada)}).` : ""}`,
      tom: d.ebitda > 0 ? "bom" : "ruim",
    }),
    ind({
      chave: "geracaoRecursos",
      titulo: "Geração Interna de Recursos (FFO)",
      valor: ffo,
      formato: "moeda",
      oQueE: "Recursos gerados pelo resultado do período antes das variações de capital de giro: lucro líquido mais as despesas que não saem do caixa (depreciação), menos receitas que não entram (equivalência).",
      formula: "FFO = Lucro Líquido + Depreciação e Amortização − Equivalência Patrimonial",
      componentes: [
        { rotulo: "Lucro líquido", valor: d.lucroLiquido, sinal: "+" },
        { rotulo: "Depreciação e amortização", valor: d.depreciacaoUsada, sinal: "+" },
        { rotulo: "Equivalência patrimonial", valor: d.equivalenciaPatrimonial, sinal: "-" },
      ].filter((c) => c.valor !== 0),
      leitura: `O resultado do período gerou ${brl(ffo)} de recursos antes do capital de giro.`,
      tom: ffo > 0 ? "bom" : "ruim",
    }),
    ind({
      chave: "geracaoOperacionalCaixa",
      titulo: "Geração Operacional de Caixa",
      valor: goc,
      formato: "moeda",
      oQueE: "O que sobra em caixa da operação depois de financiar o aumento (ou liberar a redução) da necessidade de capital de giro.",
      formula: "Geração Operacional = FFO − Variação da NCG",
      componentes: [
        { rotulo: "FFO", valor: ffo, sinal: "+" },
        { rotulo: "Variação da NCG no mês", valor: varNcg, sinal: "-" },
      ],
      leitura:
        goc === null
          ? "Sem balanço anterior para medir a variação da NCG."
          : `A NCG ${varNcg! >= 0 ? "aumentou" : "diminuiu"} ${brl(Math.abs(varNcg!))}; a operação ${goc >= 0 ? "gerou" : "consumiu"} ${brl(Math.abs(goc))} de caixa no mês.`,
      tom: goc === null ? "neutro" : goc >= 0 ? "bom" : "atencao",
    }),
  ];

  // ---------------------------------------------------------------- Conferencias
  const conferencias: Conferencia[] = [];
  const pdf = registro.conferenciaPdf;
  const okAtivo = Math.abs(t.at - pdf.totalAtivo) < 1;
  conferencias.push({
    titulo: "Total do ativo extraído = total do PDF",
    ok: okAtivo,
    detalhe: okAtivo
      ? `Soma dos campos ${brl(t.at)} confere com o PDF.`
      : `Soma dos campos ${brl(t.at)} × PDF ${brl(pdf.totalAtivo)} (diferença ${brl(t.at - pdf.totalAtivo)}). Alguma conta ficou fora ou foi classificada em dobro.`,
  });
  const totPassPl = t.pc + t.pnc + t.plContabil;
  const okPass = Math.abs(totPassPl - pdf.totalPassivoPl) < 1;
  conferencias.push({
    titulo: "Total do passivo + PL extraído = total do PDF",
    ok: okPass,
    detalhe: okPass
      ? `Soma dos campos ${brl(totPassPl)} confere com o PDF.`
      : `Soma dos campos ${brl(totPassPl)} × PDF ${brl(pdf.totalPassivoPl)} (diferença ${brl(totPassPl - pdf.totalPassivoPl)}).`,
  });
  if (Math.abs(t.diferenca) >= 1) {
    const bate = Math.abs(t.diferenca - d.lucroLiquido) < 1;
    conferencias.push({
      titulo: "Balanço fecha (Ativo = Passivo + PL)",
      ok: bate,
      detalhe: bate
        ? `A diferença de ${brl(t.diferenca)} é o resultado do período ainda não lançado no PL; foi incorporada ao PL ajustado.`
        : `Ativo − (Passivo + PL) = ${brl(t.diferenca)}, que não bate com o lucro do período. Incorporado ao PL ajustado para fechar o balanço - conferir com a contabilidade.`,
    });
  } else {
    conferencias.push({ titulo: "Balanço fecha (Ativo = Passivo + PL)", ok: true, detalhe: "Ativo igual a Passivo + PL." });
  }
  const llCalcBruto = calcularDre(registro.dre, null).lucroLiquido;
  const okLl = Math.abs(llCalcBruto - pdf.lucroLiquido) < 1;
  conferencias.push({
    titulo: "Lucro líquido recalculado = lucro do PDF",
    ok: okLl,
    detalhe: okLl
      ? `Lucro recalculado ${brl(llCalcBruto)} confere com a DRE do PDF.`
      : `Recalculado ${brl(llCalcBruto)} × PDF ${brl(pdf.lucroLiquido)} (diferença ${brl(llCalcBruto - pdf.lucroLiquido)}).`,
  });
  if (balAnt && ta && periodo.mensal) {
    const varPl = t.pl - ta.pl;
    const outros = varPl - d.lucroLiquido;
    // Movimentos fora do resultado devem aparecer em capital/reservas; o que
    // sobrar em lucros acumulados sem passar pela DRE indica distribuicao ou erro.
    const varCapitalReservas = b.capitalSocial + b.reservas - (balAnt.capitalSocial + balAnt.reservas);
    const explicado = Math.abs(outros - varCapitalReservas) < 1;
    conferencias.push({
      titulo: "Variação do PL explicada pelo lucro do mês",
      ok: explicado,
      detalhe:
        Math.abs(outros) < 1
          ? `O PL variou ${brl(varPl)}, exatamente o lucro do mês - confirma que a DRE é do mês isolado.`
          : explicado
            ? `O PL variou ${brl(varPl)}: lucro do mês de ${brl(d.lucroLiquido)} e ${brl(outros)} de movimentação em capital/reservas (aportes ou ajustes de exercícios anteriores).`
            : `O PL variou ${brl(varPl)}, o lucro do mês foi ${brl(d.lucroLiquido)} e capital/reservas variaram ${brl(varCapitalReservas)}: ${brl(outros - varCapitalReservas)} saíram de lucros acumulados sem passar pela DRE (distribuição de lucros?).`,
    });
  }
  if (registro.balancoAnterior && regAnt) {
    const ta2 = totais(registro.balancoAnterior);
    const igual = Math.abs(ta2.at - totais(regAnt.balanco).at) < 1;
    conferencias.push({
      titulo: "Saldo anterior do PDF = balanço do mês anterior salvo",
      ok: igual,
      detalhe: igual
        ? "A coluna de saldo anterior bate com o balanço do mês anterior cadastrado."
        : `Saldo anterior do PDF (${brl(ta2.at)}) difere do balanço salvo de ${rotuloCompetencia(regAnt.competencia)} (${brl(totais(regAnt.balanco).at)}) - houve lançamento retroativo.`,
    });
  }

  const valoresAtuais: Record<string, number> = { ...registro.balanco, ...registro.dre };
  const origemDivergente = Object.entries(registro.origens)
    .map(([campo, contas]) => ({ campo, soma: contas.reduce((s, c) => s + c.valor, 0), valor: valoresAtuais[campo] }))
    .filter((o) => o.valor !== undefined && Math.abs(o.soma - o.valor) >= 1);
  const semOrigem = Object.entries(valoresAtuais).filter(([k, v]) => Math.abs(v) >= 1 && !(registro.origens[k]?.length));
  conferencias.push({
    titulo: "Contas de origem somam o valor de cada campo",
    ok: origemDivergente.length === 0 && semOrigem.length === 0,
    detalhe:
      origemDivergente.length === 0 && semOrigem.length === 0
        ? "Cada número do sistema está rastreado até as contas do PDF e a soma confere."
        : [
            ...origemDivergente.map((o) => `${ROTULO_CAMPO(o.campo)}: contas somam ${brl(o.soma)} × campo ${brl(o.valor)}`),
            ...semOrigem.map(([k]) => `${ROTULO_CAMPO(k)} sem conta de origem`),
          ].join("; "),
  });

  return {
    registro,
    periodo,
    temAnterior: !!balAnt,
    fonteAnterior,
    ativo,
    passivo,
    dre,
    dfc,
    secoes: [
      { titulo: "Capital de Giro", descricao: "Necessidade de capital de giro, tesouraria e ciclo de caixa (modelo Fleuriet).", indicadores: capitalGiro },
      { titulo: "Liquidez", descricao: "Capacidade de pagar as obrigações.", indicadores: liquidez },
      { titulo: "Endividamento e Estrutura", descricao: "Tamanho, prazo e custo da dívida.", indicadores: estrutura },
      { titulo: "Rentabilidade", descricao: `Margens e retornos do período (${periodo.descricao}).`, indicadores: rentabilidade },
      { titulo: "Geração de Caixa", descricao: "EBITDA, geração interna de recursos e geração operacional de caixa.", indicadores: geracao },
    ],
    conferencias,
  };
}

// ---------------------------------------------------------------------------
// Demonstracao dos Fluxos de Caixa (indireta, entre dois balancos)

function fluxoDeCaixa(b: Balanco, a: Balanco, t: Totais, ta: Totais, d: DreCalc): Linha[] {
  const v = (k: ChaveBalanco) => b[k] - a[k]; // variacao do saldo
  const L: Linha[] = [];
  const add = (rotulo: string, valor: number, nivel: 0 | 1 | 2, campos?: string[]) => {
    L.push({ rotulo, valor, anterior: null, av: null, ah: null, nivel, campos });
    return valor;
  };

  add("EBITDA", d.ebitda, 1);
  const irPago = d.irCs - v("irCsRecolher");
  add("(-) IRPJ e CSLL pagos (provisão − variação do IR/CS a recolher)", -irPago, 2, ["irCs", "irCsRecolher"]);
  const gic = add("Geração Interna de Caixa", d.ebitda - irPago, 0);

  const wc: [string, number, string[]][] = [
    ["Contas a receber de clientes", -(v("clientes") + v("clientesPartesRelacionadas")), ["clientes", "clientesPartesRelacionadas"]],
    ["Estoques", -v("estoques"), ["estoques"]],
    ["Adiantamento a fornecedores", -v("adiantamentoFornecedores"), ["adiantamentoFornecedores"]],
    ["Tributos a recuperar", -v("tributosRecuperar"), ["tributosRecuperar"]],
    ["Outros ativos operacionais", -v("outrosAtivosOperacionaisCirc"), ["outrosAtivosOperacionaisCirc"]],
    ["Fornecedores", v("fornecedores"), ["fornecedores"]],
    ["Adiantamentos de clientes", v("adiantamentosClientes"), ["adiantamentosClientes"]],
    ["Salários, encargos e impostos a recolher", v("salariosEncargos") + v("impostosRecolher"), ["salariosEncargos", "impostosRecolher"]],
    ["Outros passivos circulantes", v("outrosPassivosCirc"), ["outrosPassivosCirc"]],
  ];
  let varGiro = 0;
  for (const [r, val, c] of wc) if (val !== 0) varGiro += add(`   ${r}`, val, 2, c);
  add("(=) Variação do Capital de Giro", varGiro, 1);
  const fco = add("FLUXO DE CAIXA OPERACIONAL", gic + varGiro, 0);

  const naoOp =
    -v("derivativosHedge") -
    v("outrosAtivosNaoOperacionaisCirc") -
    v("rlpClientes") -
    v("rlpTributos") -
    v("rlpDepositosJudiciais") -
    v("rlpOutros") +
    v("derivativosPassivo") +
    v("tributosLP") +
    v("provisoesLP") +
    v("outrosPassivosNaoCirc");
  add("   Ativos e passivos não operacionais (hedge, LP, provisões)", naoOp, 2, ["derivativosHedge", "derivativosPassivo", "outrosAtivosNaoOperacionaisCirc", "rlpOutros", "rlpTributos", "tributosLP", "provisoesLP"]);
  const naoOpRes = d.resultadoNaoOperacional - d.participacoes;
  if (naoOpRes !== 0) add("   Resultado não operacional e participações", naoOpRes, 2, ["resultadoNaoOperacional", "participacoes"]);
  const antesFin = add("CAIXA ANTES DO RESULTADO FINANCEIRO", fco + naoOp + naoOpRes, 0);

  add("   (+) Receitas financeiras", d.receitasFinanceiras, 2, ["receitasFinanceiras"]);
  add("   (-) Despesas financeiras", -d.despesasFinanceiras, 2, ["despesasFinanceiras"]);
  add("   (+/-) Variação cambial e monetária líquida", d.variacaoCambialLiquida, 2, ["variacaoCambialLiquida"]);
  const aposFin = add("CAIXA APÓS RESULTADO FINANCEIRO", antesFin + d.resultadoFinanceiro, 0);

  const movPl = t.pl - ta.pl - d.lucroLiquido;
  add("   Movimentações do PL (aportes, distribuições, ajustes)", movPl, 2, ["capitalSocial", "reservas", "lucrosAcumulados"]);
  const capex = -(t.imobilizadoLiquido - ta.imobilizadoLiquido + d.depreciacaoUsada) - v("intangivel");
  add("   Imobilizado e intangível (capex)", capex, 2, ["imobilizadoBruto", "depreciacaoAcumulada", "intangivel"]);
  const invest = -v("investimentos") + d.equivalenciaPatrimonial;
  add("   Investimentos (participações)", invest, 2, ["investimentos"]);
  const aposInv = add("FLUXO DE CAIXA APÓS INVESTIMENTOS", aposFin + movPl + capex + invest, 0);

  const fin: [string, number, string[]][] = [
    ["Empréstimos e financiamentos CP", v("emprestimosCP"), ["emprestimosCP"]],
    ["ACC / ACE", v("accAce"), ["accAce"]],
    ["Empréstimos LP", v("emprestimosLP"), ["emprestimosLP"]],
    ["Mútuos de sócios/coligadas (passivo)", v("partesRelacionadasCP") + v("partesRelacionadasLP"), ["partesRelacionadasCP", "partesRelacionadasLP"]],
    ["Créditos com sócios/coligadas (ativo)", -v("rlpPartesRelacionadas"), ["rlpPartesRelacionadas"]],
    ["Dividendos a pagar", v("dividendosPagar"), ["dividendosPagar"]],
  ];
  let varFin = 0;
  for (const [r, val, c] of fin) if (val !== 0) varFin += add(`   ${r}`, val, 2, c);
  add("(=) Fluxo de Financiamentos", varFin, 1);
  const gerado = add("FLUXO DE CAIXA GERADO NO MÊS", aposInv + varFin, 0);

  add("Caixa inicial (caixa + aplicações)", ta.caixaDisponivel, 1, ["caixa", "aplicacoesFinanceiras"]);
  add("Caixa final calculado", ta.caixaDisponivel + gerado, 1);
  add("Caixa final do balanço", t.caixaDisponivel, 1, ["caixa", "aplicacoesFinanceiras"]);
  add("Diferença (deve ser zero)", t.caixaDisponivel - (ta.caixaDisponivel + gerado), 2);
  return L;
}

// ---------------------------------------------------------------------------

function ebitdaUltimos12(comp: string, porComp: Map<string, RegistroCredito>): number | null {
  let c = comp;
  let total = 0;
  for (let i = 0; i < 12; i++) {
    const r = porComp.get(c);
    const m = dreDoMes(c, porComp);
    if (!r || !m) return null;
    total += calcularDre(m, depreciacaoDoMes(c, porComp)).ebitda;
    c = mesAnterior(c);
  }
  return total;
}

function tipoFleuriet(ccl: number, ncg: number, t: number): { tipo: string; leitura: string; tom: Tom } {
  const p = (x: number) => x >= 0;
  if (p(ccl) && !p(ncg) && p(t))
    return { tipo: "Tipo I - Excelente", tom: "bom", leitura: "CCL positivo, NCG negativa e tesouraria positiva: a operação gera recursos e sobra caixa." };
  if (p(ccl) && p(ncg) && p(t))
    return { tipo: "Tipo II - Sólida", tom: "bom", leitura: "CCL positivo cobre toda a NCG e ainda sobra tesouraria positiva: o giro é financiado com recursos de longo prazo." };
  if (p(ccl) && p(ncg) && !p(t))
    return { tipo: "Tipo III - Insatisfatória", tom: "atencao", leitura: "O CCL positivo não cobre toda a NCG; a diferença é financiada com dívida de curto prazo (tesouraria negativa). Situação comum em exportadoras com ACC, mas exige acompanhamento do efeito tesoura." };
  if (!p(ccl) && p(ncg) && !p(t))
    return { tipo: "Tipo IV - Péssima", tom: "ruim", leitura: "CCL negativo e NCG positiva: toda a necessidade de giro e parte dos ativos permanentes são financiadas por dívida de curto prazo." };
  if (!p(ccl) && !p(ncg) && !p(t))
    return { tipo: "Tipo V - Muito Ruim", tom: "ruim", leitura: "CCL negativo maior que a NCG negativa: os recursos operacionais não bastam e a empresa depende de crédito de curto prazo." };
  if (!p(ccl) && !p(ncg) && p(t))
    return { tipo: "Tipo VI - Alto Risco", tom: "atencao", leitura: "Tesouraria positiva sustentada por NCG negativa (fornecedores) com CCL negativo: estrutura frágil se os fornecedores encurtarem prazos." };
  return { tipo: "Indefinida", tom: "neutro", leitura: "Combinação de sinais atípica." };
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function rotuloCompetencia(comp: string) {
  const [a, m] = comp.split("-");
  return `${MESES[Number(m) - 1]}/${a}`;
}

export const ROTULO_CAMPO = (chave: string) => CAMPO_POR_CHAVE[chave]?.rotulo ?? chave;
