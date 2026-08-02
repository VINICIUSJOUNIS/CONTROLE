import { z } from "zod";

// Forma canonica dos dados extraidos de um balanco/balancete. Usado tanto para
// validar a saida da IA (src/lib/anthropic.ts) quanto o formulario de revisao
// em /importar antes de gravar no banco. Espelha as abas Ativo/Passivo/DRE da
// planilha "Analise de Balanco para Credito" linha a linha.
export const financialStatementFieldsSchema = z.object({
  periodLabel: z.string().min(1),
  referenceDate: z.string().min(1), // "AAAA-MM-DD"
  periodDays: z.number().int().positive(),

  // DRE
  receitaBruta: z.number(),
  deducoes: z.number(),
  receitaLiquida: z.number(),
  cmv: z.number(),
  lucroBruto: z.number(),
  outrasReceitasOperacionais: z.number(),
  despesasGerais: z.number(),
  despesasComerciais: z.number(),
  despesasTributarias: z.number(),
  depreciacaoAmortizacao: z.number(),
  outrasDespesasOperacionais: z.number(),
  resultadoAtividade: z.number(), // EBIT
  receitasFinanceiras: z.number(),
  despesasFinanceiras: z.number(),
  variacaoCambial: z.number(),
  resultadoNaoOperacional: z.number(),
  impostoRenda: z.number(),
  participacoes: z.number(),
  lucroLiquido: z.number(),

  // Ativo Circulante
  caixaEquivalentes: z.number(),
  titulosValoresMobiliarios: z.number(),
  contasReceberClientes: z.number(),
  estoques: z.number(),
  adiantamentoFornecedores: z.number(),
  outrosAtivosOperacionaisCirc: z.number(),
  outrosAtivosNaoOperacionaisCirc: z.number(),

  // Ativo Nao Circulante
  contasReceberColigadas: z.number(),
  investimentos: z.number(),
  imobilizado: z.number(),
  intangivel: z.number(),
  outrosAtivosNaoCirculantes: z.number(),

  // Passivo Circulante
  fornecedores: z.number(),
  salariosEncargos: z.number(),
  impostosContribuicoes: z.number(),
  emprestimosCurtoPrazo: z.number(),
  irAPagar: z.number(),
  emprestimosColigadasCP: z.number(),
  dividendosAPagar: z.number(),
  adiantamentosClientes: z.number(),
  outrosPassivosCirc: z.number(),

  // Passivo Nao Circulante
  emprestimosLongoPrazo: z.number(),
  outrosPassivosNaoCirc: z.number(),

  // Patrimonio Liquido
  capitalSocial: z.number(),
  reservas: z.number(),
  lucrosPrejuizosAcumulados: z.number(),
  outrosResultadosAbrangentes: z.number(),

  ativosMoedaEstrangeira: z.number().nullable().optional(),
  passivosMoedaEstrangeira: z.number().nullable().optional(),
});

export type FinancialStatementFields = z.infer<typeof financialStatementFieldsSchema>;

export const financialStatementFieldKeys = Object.keys(
  financialStatementFieldsSchema.shape
) as (keyof FinancialStatementFields)[];

// Valores em branco para o formulario de lancamento manual (sem extracao por IA).
export function emptyFinancialStatementFields(): FinancialStatementFields {
  const zeros = {} as FinancialStatementFields;
  for (const key of financialStatementFieldKeys) {
    (zeros as Record<string, unknown>)[key] = 0;
  }
  zeros.periodLabel = "";
  zeros.referenceDate = new Date().toISOString().slice(0, 10);
  zeros.periodDays = 90;
  zeros.ativosMoedaEstrangeira = null;
  zeros.passivosMoedaEstrangeira = null;
  return zeros;
}

export const dreFieldLabels: Record<string, string> = {
  receitaBruta: "Receita Operacional Bruta",
  deducoes: "Deduções (impostos sobre vendas, devoluções)",
  receitaLiquida: "Receita Operacional Líquida",
  cmv: "Custo das Mercadorias/Produtos/Serviços Vendidos",
  lucroBruto: "Lucro Bruto",
  outrasReceitasOperacionais: "Outras Receitas Operacionais",
  despesasGerais: "Despesas Gerais e Administrativas",
  despesasComerciais: "Despesas Comerciais",
  despesasTributarias: "Despesas Tributárias",
  depreciacaoAmortizacao: "Depreciação e Amortização",
  outrasDespesasOperacionais: "Outras Despesas Operacionais",
  resultadoAtividade: "Resultado da Atividade (EBIT)",
  receitasFinanceiras: "Receitas Financeiras",
  despesasFinanceiras: "Despesas Financeiras",
  variacaoCambial: "Variação Monetária/Cambial Líquida",
  resultadoNaoOperacional: "Receitas/Despesas Não Operacionais",
  impostoRenda: "IR e CSLL sobre o Lucro",
  participacoes: "Participações",
  lucroLiquido: "Lucro Líquido do Período",
};

export const ativoFieldLabels: Record<string, string> = {
  caixaEquivalentes: "Caixa e Equivalentes",
  titulosValoresMobiliarios: "Títulos e Valores Mobiliários",
  contasReceberClientes: "Contas a Receber de Clientes",
  estoques: "Estoques",
  adiantamentoFornecedores: "Adiantamento a Fornecedores",
  outrosAtivosOperacionaisCirc: "Outros Ativos Operacionais (Circulante)",
  outrosAtivosNaoOperacionaisCirc: "Outros Ativos Não Operacionais (Circulante)",
  contasReceberColigadas: "Contas a Receber de Coligadas (Longo Prazo)",
  investimentos: "Investimentos",
  imobilizado: "Imobilizado",
  intangivel: "Intangível",
  outrosAtivosNaoCirculantes: "Outros Ativos Não Circulantes",
};

export const passivoFieldLabels: Record<string, string> = {
  fornecedores: "Fornecedores",
  salariosEncargos: "Salários e Encargos Sociais a Pagar",
  impostosContribuicoes: "Impostos e Contribuições a Pagar",
  emprestimosCurtoPrazo: "Empréstimos e Financiamentos (Curto Prazo)",
  irAPagar: "Imposto de Renda a Pagar",
  emprestimosColigadasCP: "Empréstimos de Coligadas (Curto Prazo)",
  dividendosAPagar: "Dividendos a Pagar",
  adiantamentosClientes: "Adiantamentos de Clientes",
  outrosPassivosCirc: "Outros Passivos (Circulante)",
  emprestimosLongoPrazo: "Empréstimos e Financiamentos (Longo Prazo)",
  outrosPassivosNaoCirc: "Outros Passivos Não Circulantes",
  capitalSocial: "Capital Social Integralizado",
  reservas: "Reservas de Capital e de Lucros",
  lucrosPrejuizosAcumulados: "Lucros/Prejuízos Acumulados",
  outrosResultadosAbrangentes: "Outros Resultados Abrangentes",
};

export const cambialFieldLabels: Record<string, string> = {
  ativosMoedaEstrangeira: "Ativos em Moeda Estrangeira (opcional)",
  passivosMoedaEstrangeira: "Passivos em Moeda Estrangeira (opcional)",
};

export const monetaryFieldLabels: Record<string, string> = {
  ...dreFieldLabels,
  ...ativoFieldLabels,
  ...passivoFieldLabels,
  ...cambialFieldLabels,
};
