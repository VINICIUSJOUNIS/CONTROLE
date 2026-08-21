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

export type BudgetScenarioKey = "CONSERVADOR" | "MODERADO" | "OTIMISTA" | "MUITO_OTIMISTA";

export const SCENARIO_LABELS: Record<BudgetScenarioKey, string> = {
  CONSERVADOR: "Conservador",
  MODERADO: "Moderado",
  OTIMISTA: "Otimista",
  MUITO_OTIMISTA: "Muito Otimista",
};
