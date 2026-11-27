// Constantes de rotulos/ordem do Planejamento Orcamentario, sem nenhuma
// dependencia do Prisma - seguro para importar tanto de codigo de servidor
// (budget-data.ts) quanto de componentes client (planejamento-view.tsx).
// Um arquivo que mistura essas constantes com `import { prisma } from
// "@/lib/prisma"` nao pode ser importado por um componente client: mesmo so
// usando os valores (nao as funcoes de banco), o bundler nao consegue
// eliminar o restante do modulo e acaba levando o driver do Postgres (que
// usa `fs`) para o bundle do navegador.

export type BudgetGroupKey =
  | "CUSTO_FORNECEDOR"
  | "DESPESA_MERCADO_INTERNO"
  | "DESPESA_MERCADO_EXTERNO"
  | "DESPESA_ADM_FIXA"
  | "DESPESA_ADM_VARIAVEL"
  | "DESPESA_PESSOAL"
  | "IMPOSTOS"
  | "FINANCIAMENTO"
  | "INVESTIMENTOS";

export const BUDGET_GROUP_ORDER: BudgetGroupKey[] = [
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

export const BUDGET_GROUP_LABELS: Record<BudgetGroupKey, string> = {
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
export const CUSTO_VARIAVEL_GROUPS: BudgetGroupKey[] = [
  "CUSTO_FORNECEDOR",
  "DESPESA_MERCADO_INTERNO",
  "DESPESA_MERCADO_EXTERNO",
  "DESPESA_ADM_VARIAVEL",
  "IMPOSTOS",
];
export const CUSTO_FIXO_GROUPS: BudgetGroupKey[] = ["DESPESA_ADM_FIXA", "DESPESA_PESSOAL", "FINANCIAMENTO"];

// Ponto de Equilibrio pela margem de contribuicao: custos fixos / (1 - %
// custo variavel sobre a receita). Sem receita nao ha como medir o % variavel
// (null); com variaveis >= receita, nenhuma receita cobre os fixos (null).
export function calcPontoEquilibrio(custosFixos: number, custosVariaveis: number, receita: number) {
  const custosVariaveisPercent = receita > 0 ? custosVariaveis / receita : null;
  const valorReais =
    custosVariaveisPercent !== null && custosVariaveisPercent < 1
      ? Number((custosFixos / (1 - custosVariaveisPercent)).toFixed(2))
      : null;
  return {
    custosFixos: Number(custosFixos.toFixed(2)),
    custosVariaveis: Number(custosVariaveis.toFixed(2)),
    custosVariaveisPercent: custosVariaveisPercent !== null ? Number(custosVariaveisPercent.toFixed(4)) : null,
    valorReais,
  };
}

export type BudgetScenarioKey = "CONSERVADOR" | "MODERADO" | "OTIMISTA" | "MUITO_OTIMISTA";

export const SCENARIO_LABELS: Record<BudgetScenarioKey, string> = {
  CONSERVADOR: "Conservador",
  MODERADO: "Moderado",
  OTIMISTA: "Otimista",
  MUITO_OTIMISTA: "Muito Otimista",
};

// Reforma tributaria, ano de 2027 (mesmas premissas do quadro de Tributos).
export const ALIQ_CBS_2027 = 11.2; // referencia TCU 11,3% menos 0,1 p.p. (2027-2028)
export const ALIQ_IBS_2027 = 0.1; // 0,05% estadual + 0,05% municipal

// Despesas com fornecedores PJ que geram credito de CBS/IBS: mercado interno/
// externo, administrativas e, do custo do fornecedor, so fretes e armazenagem
// (o custo do cafe - alíquota zero - e o Funrural ficam de fora).
export function ehDespesaCreditavel(group: string, name: string) {
  return (
    ["DESPESA_MERCADO_INTERNO", "DESPESA_MERCADO_EXTERNO", "DESPESA_ADM_FIXA", "DESPESA_ADM_VARIAVEL"].includes(group) ||
    (group === "CUSTO_FORNECEDOR" && /frete|armazen/i.test(name))
  );
}
