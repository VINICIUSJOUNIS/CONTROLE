import type { FinancialStatementFields } from "./schema";

// Um FinancialStatement do Prisma tem os mesmos campos numericos de
// FinancialStatementFields, so que como Decimal em vez de number, mais
// referenceDate como Date. Aceitamos ambos os formatos aqui.
export type StatementInput = Omit<FinancialStatementFields, "referenceDate"> & {
  referenceDate: Date;
};

function div(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return numerator / denominator;
}

// --- Balanco Patrimonial -----------------------------------------------

export function ativoCirculante(s: StatementInput) {
  return (
    s.caixaEquivalentes +
    s.titulosValoresMobiliarios +
    s.contasReceberClientes +
    s.estoques +
    s.adiantamentoFornecedores +
    s.outrosAtivosOperacionaisCirc +
    s.outrosAtivosNaoOperacionaisCirc
  );
}

export function ativoNaoCirculante(s: StatementInput) {
  return s.contasReceberColigadas + s.investimentos + s.imobilizado + s.intangivel + s.outrosAtivosNaoCirculantes;
}

export function ativoTotal(s: StatementInput) {
  return ativoCirculante(s) + ativoNaoCirculante(s);
}

export function passivoCirculante(s: StatementInput) {
  return (
    s.fornecedores +
    s.salariosEncargos +
    s.impostosContribuicoes +
    s.emprestimosCurtoPrazo +
    s.irAPagar +
    s.emprestimosColigadasCP +
    s.dividendosAPagar +
    s.adiantamentosClientes +
    s.outrosPassivosCirc
  );
}

export function passivoNaoCirculante(s: StatementInput) {
  return s.emprestimosLongoPrazo + s.outrosPassivosNaoCirc;
}

export function patrimonioLiquido(s: StatementInput) {
  return s.capitalSocial + s.reservas + s.lucrosPrejuizosAcumulados + s.outrosResultadosAbrangentes;
}

export function passivoTotal(s: StatementInput) {
  return passivoCirculante(s) + passivoNaoCirculante(s) + patrimonioLiquido(s);
}

// Realizavel a Longo Prazo = itens do Ativo Nao Circulante que ainda viram
// caixa (recebiveis), excluindo os itens permanentes (Investimentos,
// Imobilizado, Intangivel) - usado na Liquidez Geral.
export function realizavelLongoPrazo(s: StatementInput) {
  return s.contasReceberColigadas + s.outrosAtivosNaoCirculantes;
}

export function exigivelTotal(s: StatementInput) {
  return passivoCirculante(s) + passivoNaoCirculante(s);
}

// --- Indices de Liquidez ---------------------------------------------------

export function liquidezCorrente(s: StatementInput) {
  return div(ativoCirculante(s), passivoCirculante(s));
}

export function liquidezSeca(s: StatementInput) {
  return div(ativoCirculante(s) - s.estoques, passivoCirculante(s));
}

export function liquidezGeral(s: StatementInput) {
  return div(ativoCirculante(s) + realizavelLongoPrazo(s), exigivelTotal(s));
}

// --- Indices de Estrutura ----------------------------------------------------

export function participacaoCapitalTerceiros(s: StatementInput) {
  return div(exigivelTotal(s), patrimonioLiquido(s));
}

// Composicao das Exigibilidades = PC / (PC+PNC) - quanto da divida total e
// de curto prazo. O rotulo da planilha original diz "(PNC/PC+PNC)" mas a
// formula de fato usada la e PC/(PC+PNC) (formula classica de "composicao
// do endividamento") - seguimos a formula real, nao o rotulo.
export function composicaoExigibilidades(s: StatementInput) {
  return div(passivoCirculante(s), exigivelTotal(s));
}

// Participacao da Divida Financeira = Divida Financeira (emprestimos) sobre
// o Exigivel Total.
export function participacaoDividaFinanceira(s: StatementInput) {
  return div(dividaBruta(s), exigivelTotal(s));
}

export function plSobreAtivo(s: StatementInput) {
  return div(patrimonioLiquido(s), ativoTotal(s));
}

// Alavancagem Financeira (GAF - Grau de Alavancagem Financeira) = ROE /
// (EBIT/Ativo Total) = (Lucro Liquido/PL) / (Lucro antes do resultado
// financeiro/Ativo Total). Mede se o endividamento esta ampliando ou
// reduzindo o retorno sobre o patrimonio em relacao ao retorno operacional.
export function alavancagemFinanceira(s: StatementInput) {
  const roe = div(s.lucroLiquido, patrimonioLiquido(s));
  const roaOperacional = div(ebit(s), ativoTotal(s));
  if (roe === null || roaOperacional === null || roaOperacional === 0) return null;
  return roe / roaOperacional;
}

// --- DRE / rentabilidade -------------------------------------------------

// EBIT = Resultado da Atividade (antes do resultado financeiro e do IR).
export function ebit(s: StatementInput) {
  return s.resultadoAtividade;
}

export function ebitda(s: StatementInput) {
  return s.resultadoAtividade + s.depreciacaoAmortizacao;
}

export function resultadoFinanceiro(s: StatementInput) {
  return s.receitasFinanceiras - s.despesasFinanceiras + s.variacaoCambial;
}

export function margemEbitda(s: StatementInput) {
  return div(ebitda(s), s.receitaLiquida);
}

export function margemLiquida(s: StatementInput) {
  return div(s.lucroLiquido, s.receitaLiquida);
}

// --- Indices de Rentabilidade ------------------------------------------------

export function giroDoAtivo(s: StatementInput) {
  return div(s.receitaLiquida, ativoTotal(s));
}

// Lucratividade nas Vendas (LL/Receita) - mesmo indicador de margemLiquida
// acima, mantido como alias para casar com o nome usado na planilha.
export const lucratividadeNasVendas = margemLiquida;

export function rentabilidadeDoAtivo(s: StatementInput) {
  return div(s.lucroLiquido, ativoTotal(s));
}

// Media Mensal de Receita Liquida. A planilha original divide pelo digito do
// mes de fechamento (so funciona quando o periodo comeca em janeiro); aqui
// generalizamos para qualquer periodo usando a duracao real em dias.
export function mediaMensalReceita(s: StatementInput) {
  const meses = s.periodDays / 30;
  return meses > 0 ? s.receitaLiquida / meses : null;
}

// --- Ciclo financeiro ------------------------------------------------------

// PMR/PME/PMP em dias, usando saldos de fechamento do periodo (nao a media
// entre abertura/fechamento) - simplificacao razoavel para MVP, ja que
// balancetes isolados nao trazem o saldo inicial do periodo.
export function cicloFinanceiro(s: StatementInput) {
  const _pmr = pmrDias(s);
  const _pme = pmeDias(s);
  const _pmp = pmpDias(s);
  if (_pmr === null || _pme === null || _pmp === null) return null;
  return _pmr + _pme - _pmp;
}

export function pmrDias(s: StatementInput) {
  const ratio = div(s.contasReceberClientes, s.receitaBruta);
  return ratio === null ? null : ratio * s.periodDays;
}

export function pmeDias(s: StatementInput) {
  const ratio = div(s.estoques, s.cmv);
  return ratio === null ? null : ratio * s.periodDays;
}

export function pmpDias(s: StatementInput) {
  const ratio = div(s.fornecedores, s.cmv);
  return ratio === null ? null : ratio * s.periodDays;
}

// --- Estrutura de capital (modelo Fleuriet) -------------------------------

export function dividaBruta(s: StatementInput) {
  return s.emprestimosCurtoPrazo + s.emprestimosLongoPrazo;
}

// Liquidez imediata para fins de divida liquida inclui aplicacoes
// financeiras de curto prazo (Titulos e Valores Mobiliarios), nao so caixa -
// pratica padrao em analise de credito (net debt = divida bruta - caixa e
// equivalentes - aplicacoes financeiras de liquidez).
export function dividaLiquida(s: StatementInput) {
  return dividaBruta(s) - s.caixaEquivalentes - s.titulosValoresMobiliarios;
}

// CCL (Capital Circulante Liquido) = Ativo Circulante - Passivo Circulante.
export function capitalDeGiro(s: StatementInput) {
  return ativoCirculante(s) - passivoCirculante(s);
}

// Total de Investimentos Operacionais (lado do Ativo na NCG) = Contas a
// Receber de Clientes + Estoques + Outros Ativos Operacionais. Formula
// conferida diretamente contra a planilha original (aba "Input Automatico",
// linhas 172-176/D176). "Adiantamento a Fornecedores e Coligadas" aparece
// como linha na planilha mas sem formula nenhuma associada (nao alimentada
// por nenhuma conta) - por isso fica de fora tambem aqui.
export function totalInvestimentosOperacionais(s: StatementInput) {
  return s.contasReceberClientes + s.estoques + s.outrosAtivosOperacionaisCirc;
}

// Total de Financiamentos Operacionais Recebidos (lado do Passivo na NCG) =
// Fornecedores + Salarios e Encargos/Impostos e Contribuicoes + Outros
// Passivos Operacionais. Formula conferida diretamente contra a planilha
// original (aba "Input Automatico", linhas 178-181/D181).
export function totalFinanciamentosOperacionais(s: StatementInput) {
  return s.fornecedores + s.salariosEncargos + s.impostosContribuicoes + s.outrosPassivosCirc;
}

// NCG (Necessidade de Capital de Giro) = Total de Investimentos Operacionais
// - Total de Financiamentos Operacionais Recebidos.
export function ncg(s: StatementInput) {
  return totalInvestimentosOperacionais(s) - totalFinanciamentosOperacionais(s);
}

// Variacao do N.C.G entre dois periodos consecutivos (atual - anterior).
export function variacaoNcg(atual: StatementInput, anterior: StatementInput) {
  return ncg(atual) - ncg(anterior);
}

// Ativo Erratico = Caixa e Equivalentes. Conferido contra a planilha real
// (bate exatamente em 2024 e 2025) - nao inclui Titulos e Valores
// Mobiliarios nem outros ativos financeiros de curto prazo no metodo do
// banco.
export function ativoErratico(s: StatementInput) {
  return s.caixaEquivalentes;
}

// Passivo Erratico = Emprestimos e Financiamentos de Curto Prazo. Conferido
// contra a planilha real (bate exatamente em 2024 e 2025).
export function passivoErratico(s: StatementInput) {
  return s.emprestimosCurtoPrazo;
}

// Saldo de Tesouraria = Ativo Erratico - Passivo Erratico, calculado direto
// (nao como CCL - NCG). CCL != NCG + Saldo Tesouraria em geral: itens como
// Titulos e Valores Mobiliarios, Adiantamento a Fornecedores, Adiantamentos
// de Clientes, IR a Pagar, Emprestimos de Coligadas (CP) e Dividendos a
// Pagar entram no CCL (via Ativo/Passivo Circulante totais) mas ficam de
// fora tanto da NCG quanto do Ativo/Passivo Erratico - a diferenca entre CCL
// e (NCG + Saldo Tesouraria) e a soma liquida desses itens "orfaos".
export function saldoTesouraria(s: StatementInput) {
  return ativoErratico(s) - passivoErratico(s);
}

export function exposicaoCambialLiquida(s: StatementInput): number | null {
  if (s.ativosMoedaEstrangeira == null || s.passivosMoedaEstrangeira == null) return null;
  return s.ativosMoedaEstrangeira - s.passivosMoedaEstrangeira;
}

// --- Analise Vertical / Horizontal ----------------------------------------

// AV = item / total do grupo (Ativo Total, Passivo Total ou Receita Liquida,
// conforme a secao). Retorna null se o total for zero.
export function analiseVertical(valor: number, total: number): number | null {
  return div(valor, total);
}

// AH = variacao percentual entre o periodo atual e o anterior. Usa o valor
// absoluto do periodo anterior como base (mesma convencao de yoyMetric),
// para nao inverter o sinal quando o periodo anterior for negativo.
export function analiseHorizontal(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / Math.abs(anterior);
}

// --- Comparacoes entre periodos --------------------------------------------

export type YoyMetric = {
  atual: number;
  anterior: number;
  variacaoPct: number | null;
};

export type YoyComparison = {
  receita: YoyMetric;
  ebitda: YoyMetric;
  lucroLiquido: YoyMetric;
  margemEbitda: YoyMetric;
};

function yoyMetric(atual: number, anterior: number): YoyMetric {
  return {
    atual,
    anterior,
    variacaoPct: anterior !== 0 ? ((atual - anterior) / Math.abs(anterior)) * 100 : null,
  };
}

export function yoyComparison(atual: StatementInput, anterior: StatementInput): YoyComparison {
  return {
    receita: yoyMetric(atual.receitaLiquida, anterior.receitaLiquida),
    ebitda: yoyMetric(ebitda(atual), ebitda(anterior)),
    lucroLiquido: yoyMetric(atual.lucroLiquido, anterior.lucroLiquido),
    margemEbitda: yoyMetric((margemEbitda(atual) ?? 0) * 100, (margemEbitda(anterior) ?? 0) * 100),
  };
}

// Statement de ~12 meses antes do statement atual, com tolerancia de 20 dias
// (balancetes mensais/trimestrais nao caem sempre na mesma data exata).
export function findSamePeriodLastYear(
  atual: StatementInput,
  historico: StatementInput[]
): StatementInput | null {
  const alvo = new Date(atual.referenceDate);
  alvo.setFullYear(alvo.getFullYear() - 1);

  let melhor: StatementInput | null = null;
  let menorDiff = Infinity;
  for (const s of historico) {
    if (s.referenceDate.getTime() === atual.referenceDate.getTime()) continue;
    const diff = Math.abs(s.referenceDate.getTime() - alvo.getTime());
    const dias = diff / (1000 * 60 * 60 * 24);
    if (dias <= 20 && diff < menorDiff) {
      menorDiff = diff;
      melhor = s;
    }
  }
  return melhor;
}

// Periodo cronologicamente anterior ao atual (o balancete imediatamente antes,
// nao necessariamente "mesmo periodo ano passado"). Usado no Fluxo de Caixa via
// EBITDA, que precisa da variacao de capital de giro entre dois periodos
// consecutivos.
export function previousStatement(
  atual: StatementInput,
  historico: StatementInput[]
): StatementInput | null {
  let melhor: StatementInput | null = null;
  for (const s of historico) {
    if (s.referenceDate.getTime() >= atual.referenceDate.getTime()) continue;
    if (!melhor || s.referenceDate.getTime() > melhor.referenceDate.getTime()) {
      melhor = s;
    }
  }
  return melhor;
}

export type FluxoCaixaProjetado = {
  disponivel: boolean;
  estimativa: number | null;
  baseUltimosPeriodos: number;
};

// Projecao simples por tendencia: media da variacao de caixa entre periodos
// consecutivos, aplicada sobre o caixa do periodo mais recente. Nao substitui
// uma DFC real - por isso e sempre rotulada como "estimativa" na UI.
export function fluxoCaixaProjetado(historicoOrdenado: StatementInput[]): FluxoCaixaProjetado {
  if (historicoOrdenado.length < 2) {
    return { disponivel: false, estimativa: null, baseUltimosPeriodos: historicoOrdenado.length };
  }
  const deltas: number[] = [];
  for (let i = 1; i < historicoOrdenado.length; i++) {
    deltas.push(historicoOrdenado[i].caixaEquivalentes - historicoOrdenado[i - 1].caixaEquivalentes);
  }
  const mediaDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const caixaAtual = historicoOrdenado[historicoOrdenado.length - 1].caixaEquivalentes;
  return {
    disponivel: true,
    estimativa: caixaAtual + mediaDelta,
    baseUltimosPeriodos: historicoOrdenado.length,
  };
}
