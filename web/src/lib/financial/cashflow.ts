import { ebitda, resultadoFinanceiro } from "./indicators";
import type { StatementInput } from "./indicators";

export type FluxoCaixaLinha = { label: string; valor: number };

export type FluxoCaixaEbitda = {
  ebitda: number;
  impostoRenda: number;
  geracaoInternaCaixa: number;
  resultadoFinanceiro: number;
  outrosItensResultado: number;
  variacaoCapitalGiro: FluxoCaixaLinha[];
  totalVariacaoCapitalGiro: number;
  fluxoCaixaOperacional: number;
  fluxoCaixaInvestimento: FluxoCaixaLinha[];
  totalFluxoCaixaInvestimento: number;
  fluxoCaixaFinanciamento: FluxoCaixaLinha[];
  totalFluxoCaixaFinanciamento: number;
  fluxoCaixaGerado: number;
  caixaInicial: number;
  caixaFinal: number;
  caixaFinalCalculado: number;
};

// Delta de caixa de uma linha de ATIVO: aumento do ativo consome caixa (sinal
// invertido). Confirmado contra a formula real da planilha (Contas a Receber,
// Estoques): delta = saldo_anterior - saldo_atual.
function deltaAtivo(atual: number, anterior: number) {
  return -(atual - anterior);
}

// Delta de caixa de uma linha de PASSIVO: aumento do passivo gera caixa (sinal
// direto). Confirmado contra a formula real da planilha (Fornecedores):
// delta = saldo_atual - saldo_anterior.
function deltaPassivo(atual: number, anterior: number) {
  return atual - anterior;
}

// Demonstracao de Fluxo de Caixa pelo metodo indireto, partindo do EBITDA -
// mesma logica da aba "Fluxo de Caixa Ebitda" da planilha do banco (Geracao
// Interna de Caixa, Variacao de Capital de Giro linha a linha, Investimento,
// Financiamento). A convencao de sinal de cada linha de capital de giro foi
// conferida contra as formulas reais da planilha. As secoes de Investimento e
// Financiamento seguem a categorizacao contabil padrao (nao a formula exata e
// bastante especifica da planilha original, que mistura Patrimonio Liquido em
// "Investimento" e nao teria como ser replicada sem o layout completo da aba
// "Input Automatico"). Precisa do periodo imediatamente anterior - por isso so
// fica disponivel a partir do segundo balancete lancado.
export function fluxoCaixaEbitda(atual: StatementInput, anterior: StatementInput): FluxoCaixaEbitda {
  const impostoRenda = atual.impostoRenda;
  const geracaoInternaCaixa = ebitda(atual) - impostoRenda;

  // EBITDA nao inclui o resultado financeiro (juros pagos/recebidos, variacao
  // cambial) - ele para no EBIT. Numa empresa endividada isso e um valor
  // relevante em caixa (nao ha saldo de "juros a pagar" separado neste
  // schema, entao o valor do periodo e tratado como caixa). Omitir esta
  // linha subestima bastante o uso de caixa em empresas com divida - foi
  // exatamente o que fechou quase 100% da divergencia (R$1 de diferenca)
  // ao reconciliar contra o caixa final real dos exercicios 2024/2025 da
  // planilha do banco.
  const resFinanceiro = resultadoFinanceiro(atual);

  // Fecha a ponte com o metodo indireto padrao: geracaoInternaCaixa +
  // resFinanceiro + outrosItens = Lucro Liquido + Depreciacao/Amortizacao
  // (o ponto de partida classico de uma DFC pelo metodo indireto). Sem isso,
  // resultados nao operacionais (ex: venda de imobilizado) e participacoes
  // de administradores/debentures no lucro ficariam de fora do fluxo.
  const outrosItensResultado = atual.resultadoNaoOperacional - atual.participacoes;

  const variacaoCapitalGiro: FluxoCaixaLinha[] = [
    {
      label: "Contas a Receber de Clientes",
      valor: deltaAtivo(atual.contasReceberClientes, anterior.contasReceberClientes),
    },
    { label: "Estoques", valor: deltaAtivo(atual.estoques, anterior.estoques) },
    {
      label: "Adiantamento a Fornecedores",
      valor: deltaAtivo(atual.adiantamentoFornecedores, anterior.adiantamentoFornecedores),
    },
    {
      label: "Outros Ativos Operacionais",
      valor: deltaAtivo(atual.outrosAtivosOperacionaisCirc, anterior.outrosAtivosOperacionaisCirc),
    },
    { label: "Fornecedores", valor: deltaPassivo(atual.fornecedores, anterior.fornecedores) },
    {
      label: "Adiantamentos de Clientes",
      valor: deltaPassivo(atual.adiantamentosClientes, anterior.adiantamentosClientes),
    },
    {
      label: "Salários, Encargos e Impostos a Pagar",
      valor: deltaPassivo(
        atual.salariosEncargos + atual.impostosContribuicoes,
        anterior.salariosEncargos + anterior.impostosContribuicoes
      ),
    },
    {
      label: "Outros Passivos Circulantes",
      valor: deltaPassivo(atual.outrosPassivosCirc, anterior.outrosPassivosCirc),
    },
  ];
  const totalVariacaoCapitalGiro = variacaoCapitalGiro.reduce((s, l) => s + l.valor, 0);

  const fluxoCaixaOperacional =
    geracaoInternaCaixa + resFinanceiro + outrosItensResultado + totalVariacaoCapitalGiro;

  const fluxoCaixaInvestimento: FluxoCaixaLinha[] = [
    { label: "Investimentos", valor: deltaAtivo(atual.investimentos, anterior.investimentos) },
    { label: "Imobilizado", valor: deltaAtivo(atual.imobilizado, anterior.imobilizado) },
    { label: "Intangível", valor: deltaAtivo(atual.intangivel, anterior.intangivel) },
    // Imobilizado/Intangivel sao saldos LIQUIDOS de depreciacao/amortizacao
    // acumulada, entao a variacao liquida acima subestima o capex real: o
    // saldo cai um pouco a cada periodo so pela depreciacao, mesmo sem
    // nenhum investimento novo. Sem um saldo bruto separado, a correcao
    // padrao e reverter aqui o efeito nao caixa da depreciacao do periodo
    // (que ja foi adicionado de volta uma vez, com outro proposito, no
    // EBITDA acima - isso nao e contagem em dobro, sao dois ajustes
    // diferentes sobre o mesmo numero).
    {
      label: "Depreciação/Amortização do período (ajuste do valor líquido do ativo)",
      valor: -atual.depreciacaoAmortizacao,
    },
  ];
  const totalFluxoCaixaInvestimento = fluxoCaixaInvestimento.reduce((s, l) => s + l.valor, 0);

  // Dividendos efetivamente pagos em caixa nao podem ser lidos direto do
  // saldo de "Dividendos a Pagar" (um aumento nesse saldo e dividendo
  // DECLARADO mas ainda NAO pago - nao consome caixa). O jeito padrao de
  // reconstruir o valor pago quando nao ha uma linha de "dividendos
  // declarados" na DRE e via o roll-forward de Lucros Acumulados:
  //   Dividendos Declarados = Lucro Liquido - Delta(Lucros Acumulados)
  //   Dividendos Pagos = Dividendos Declarados - Delta(Dividendos a Pagar)
  const deltaLucrosAcumulados = atual.lucrosPrejuizosAcumulados - anterior.lucrosPrejuizosAcumulados;
  const dividendosDeclarados = atual.lucroLiquido - deltaLucrosAcumulados;
  const dividendosPagos =
    dividendosDeclarados - deltaPassivo(atual.dividendosAPagar, anterior.dividendosAPagar);

  const fluxoCaixaFinanciamento: FluxoCaixaLinha[] = [
    {
      label: "Empréstimos e Financiamentos (Curto Prazo)",
      valor: deltaPassivo(atual.emprestimosCurtoPrazo, anterior.emprestimosCurtoPrazo),
    },
    {
      label: "Empréstimos e Financiamentos (Longo Prazo)",
      valor: deltaPassivo(atual.emprestimosLongoPrazo, anterior.emprestimosLongoPrazo),
    },
    {
      label: "Empréstimos de Coligadas (Passivo)",
      valor: deltaPassivo(atual.emprestimosColigadasCP, anterior.emprestimosColigadasCP),
    },
    // Contas a Receber de Coligadas e um ATIVO (nao circulante) - dinheiro
    // que a empresa emprestou a partes relacionadas. Uma queda nesse saldo
    // (a coligada devolvendo o emprestimo) gera caixa, por isso a convencao
    // de sinal de ativo (deltaAtivo). Confirmado contra a planilha real do
    // banco (bate exatamente).
    {
      label: "Empréstimos a Coligadas (Ativo Não Circulante)",
      valor: deltaAtivo(atual.contasReceberColigadas, anterior.contasReceberColigadas),
    },
    {
      label: "Dividendos Pagos / Distribuídos",
      valor: -dividendosPagos,
    },
    // Capital Social e conta de Patrimonio Liquido - segue a convencao de
    // passivo (aumento = entrada de caixa, ex: aporte dos socios). Reservas
    // e Outros Resultados Abrangentes ficam de fora de proposito: sao
    // normalmente reclassificacoes internas do lucro ou ajustes nao caixa
    // (ex: variacao cambial de investida no exterior), nao aportes novos.
    {
      label: "Aumento de Capital",
      valor: deltaPassivo(atual.capitalSocial, anterior.capitalSocial),
    },
  ];
  const totalFluxoCaixaFinanciamento = fluxoCaixaFinanciamento.reduce((s, l) => s + l.valor, 0);

  const fluxoCaixaGerado = fluxoCaixaOperacional + totalFluxoCaixaInvestimento + totalFluxoCaixaFinanciamento;

  const caixaInicial = anterior.caixaEquivalentes;
  const caixaFinal = atual.caixaEquivalentes;
  const caixaFinalCalculado = caixaInicial + fluxoCaixaGerado;

  return {
    ebitda: ebitda(atual),
    impostoRenda,
    geracaoInternaCaixa,
    resultadoFinanceiro: resFinanceiro,
    outrosItensResultado,
    variacaoCapitalGiro,
    totalVariacaoCapitalGiro,
    fluxoCaixaOperacional,
    fluxoCaixaInvestimento,
    totalFluxoCaixaInvestimento,
    fluxoCaixaFinanciamento,
    totalFluxoCaixaFinanciamento,
    fluxoCaixaGerado,
    caixaInicial,
    caixaFinal,
    caixaFinalCalculado,
  };
}
