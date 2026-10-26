import { prisma } from "@/lib/prisma";
import { RATE_BASIS_DAYS, RateBasisValue, saldoDevedorEm, calcLoanJurosReais, pagamentosLoanReais } from "@/lib/amortization";
import { calcBaixaJuros } from "@/lib/acc-calc";

function n(value: unknown): number {
  return Number(value);
}

export type PeriodRange = { from?: string; to?: string };

export type ModalidadeFilter = "TODOS" | "EMPRESTIMOS" | "ACC";

// Zera o lado (emprestimos ou ACC) que nao deve entrar na agregacao, conforme o
// filtro de modalidade escolhido no dashboard.
function applyModalidade<L, A>(
  loans: L[],
  accOperations: A[],
  modalidade?: ModalidadeFilter
): { loans: L[]; accOperations: A[] } {
  if (modalidade === "EMPRESTIMOS") return { loans, accOperations: [] };
  if (modalidade === "ACC") return { loans: [], accOperations };
  return { loans, accOperations };
}

// Taxa anualizada (linear, mesma convencao de dias corridos usada no resto do app),
// para poder comparar/ponderar taxas de emprestimos com bases diferentes (mensal,
// semestral, anual) e as taxas de ACC (sempre anuais) na mesma unidade.
function annualizedRate(rate: number, rateBasis: string): number {
  const basisDays = RATE_BASIS_DAYS[rateBasis as RateBasisValue] ?? RATE_BASIS_DAYS.ANUAL;
  return rate * (365 / basisDays);
}

// Media ponderada pelo valor de cada operacao - uma taxa media simples mistura
// contratos pequenos e grandes com o mesmo peso, o que nao reflete o custo real
// da carteira. Peso zero (sem contratos) retorna 0.
function weightedAvg(items: { rate: number; weight: number }[]): number {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return 0;
  return items.reduce((s, i) => s + i.rate * i.weight, 0) / totalWeight;
}

// Medias de cambio de um conjunto de ACC, ponderadas pelo valor em US$ (taxa
// media da carteira, nao media simples entre contratos). Spread em % da spot.
// Sem contratos: null.
function mediasCambioAcc(ops: { contractedValueForeign: number; spotRate: number; closingRate: number; ptaxContracting: number }[]) {
  const usd = ops.reduce((s, a) => s + a.contractedValueForeign, 0);
  if (ops.length === 0 || usd <= 0) return { spot: null, fechamento: null, ptax: null, spread: null };
  const spot = ops.reduce((s, a) => s + a.spotRate * a.contractedValueForeign, 0) / usd;
  const fechamento = ops.reduce((s, a) => s + a.closingRate * a.contractedValueForeign, 0) / usd;
  const ptax = ops.reduce((s, a) => s + a.ptaxContracting * a.contractedValueForeign, 0) / usd;
  return { spot, fechamento, ptax, spread: spot > 0 ? Math.max(0, ((spot - fechamento) / spot) * 100) : 0 };
}

// Filtra registros pela data de contratacao (formato "YYYY-MM-DD"), usando o mes ("YYYY-MM")
// como granularidade de comparacao. Sem range definido, retorna tudo.
function filterByPeriod<T extends { contractDate: string }>(items: T[], range?: PeriodRange): T[] {
  if (!range || (!range.from && !range.to)) return items;
  return items.filter((item) => {
    const month = item.contractDate.slice(0, 7);
    if (range.from && month < range.from) return false;
    if (range.to && month > range.to) return false;
    return true;
  });
}

export async function getAvailableYears() {
  const [loans, accOperations] = await Promise.all([getLoans(), getAccOperations()]);
  const years = Array.from(
    new Set([
      ...loans.map((l) => l.contractDate.slice(0, 4)),
      ...accOperations.map((a) => a.contractDate.slice(0, 4)),
    ])
  ).sort();
  return years;
}

function monthsBetween(from: Date, to: Date) {
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(days / 30));
}

function daysBetween(from: Date, to: Date) {
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(days));
}

// Base de calculo dos juros de ACC: convencao comercial de 360 dias (nao 365) -
// conferido contra o calculo real do banco (deposito de deságio em USD), bate
// exato: valorUSD x taxa x dias/360.
const DIAS_ANO_BASE = 360;

export async function getBanks() {
  const banks = await prisma.bank.findMany({ orderBy: { name: "asc" } });
  return banks.map((b) => ({ id: b.id, name: b.name, color: b.color }));
}

// Banco + canal bancario (instrucoes SWIFT/MT103) usado para auto-preencher a
// Transferencia de Ordem - cada banco pode ter o seu, cadastrado uma unica vez.
export async function getBanksWithTransferChannel() {
  const banks = await prisma.bank.findMany({
    orderBy: { name: "asc" },
    include: { transferChannel: true },
  });
  return banks.map((b) => ({
    id: b.id,
    name: b.name,
    transferChannel: b.transferChannel
      ? {
          moeda: b.transferChannel.moeda,
          instrucoes: b.transferChannel.instrucoes,
        }
      : null,
  }));
}

// Cartas de Transferencia de Ordem ja salvas - para reabrir/editar ou reimprimir
// sem redigitar tudo de novo.
export async function getTransferenciasOrdem() {
  const lista = await prisma.transferenciaOrdem.findMany({
    orderBy: { createdAt: "desc" },
  });
  return lista.map((t) => ({
    id: t.id,
    cidade: t.cidade,
    data: t.data.toISOString().slice(0, 10),
    tipo: t.tipo,
    numeroOrdem: t.numeroOrdem,
    moeda: t.moeda,
    valor: n(t.valor),
    valorExtenso: t.valorExtenso,
    bankId: t.bankId,
    bancoDestino: t.bancoDestino,
    descontaTarifa: t.descontaTarifa,
    valorTarifa: t.valorTarifa != null ? n(t.valorTarifa) : null,
    instrucoes: t.instrucoes,
    observacoes: t.observacoes,
  }));
}

// Contratos de Compra de cafe (OC) ja salvos - para reabrir/editar ou
// reimprimir sem redigitar tudo de novo.
export async function getContratosCompraCafe() {
  const lista = await prisma.contratoCompraCafe.findMany({
    orderBy: { createdAt: "desc" },
  });
  return lista.map((c) => ({
    id: c.id,
    numeroContrato: c.numeroContrato,
    dataContrato: c.dataContrato.toISOString().slice(0, 10),
    tipoOperacao: c.tipoOperacao,
    modalidade: c.modalidade,
    referenciaPagamento: c.referenciaPagamento,
    codigoComprador: c.codigoComprador,
    nomeComprador: c.nomeComprador,
    cnpjComprador: c.cnpjComprador,
    enderecoComprador: c.enderecoComprador,
    inscricaoEstadualComprador: c.inscricaoEstadualComprador,
    grupoComprador: c.grupoComprador,
    corretor: c.corretor,
    comissaoCorretor: n(c.comissaoCorretor),
    agente: c.agente,
    comissaoAgente: n(c.comissaoAgente),
    descricaoProduto: c.descricaoProduto,
    safra: c.safra,
    padrao: c.padrao,
    bebida: c.bebida,
    tipoEmbalagem: c.tipoEmbalagem,
    valorLivrePorSaca: n(c.valorLivrePorSaca),
    quantidadeSacas: c.quantidadeSacas,
    valorFaturadoPorSaca: n(c.valorFaturadoPorSaca),
    creditoIcms: c.creditoIcms,
    condicaoPagamento: c.condicaoPagamento,
    banco: c.banco,
    agencia: c.agencia,
    conta: c.conta,
    observacoes: c.observacoes,
    localRetirada: c.localRetirada,
    codigoLocalEntrega: c.codigoLocalEntrega,
    previsaoEntrega: c.previsaoEntrega ? c.previsaoEntrega.toISOString().slice(0, 10) : "",
    nomeLocalEntrega: c.nomeLocalEntrega,
    cnpjLocalEntrega: c.cnpjLocalEntrega,
    enderecoLocalEntrega: c.enderecoLocalEntrega,
    cidadeLocalEntrega: c.cidadeLocalEntrega,
  }));
}

// Aliquotas oficiais de IOF sobre credito para pessoa juridica (Decreto 6.306/2007,
// com alteracoes) - diaria sobre o saldo usado + adicional fixo. Retomadas em
// 17/07/2025 apos decisao do STF que derrubou a alta temporaria (que tinha ido
// para 0,0082% x2 e 0,95%). Conferido em ago/2026: teto de 3,38% a.a. para PJ em
// geral bate com 0,0082% x 365 + 0,38% (~3,37%).
const IOF_DIARIO_PERCENT = 0.0082;
const IOF_ADICIONAL_PERCENT = 0.38;

// Calcula dias/IOF/juros de uma unica utilizacao (uso). Usos ainda abertos
// (dataFim nula) contam os dias ate hoje; usos encerrados contam apenas ate a
// dataFim, entao quitar uma utilizacao trava o custo dela no periodo em que o
// valor esteve de fato utilizado.
function calcUso(valorUtilizado: number, taxaJurosPercent: number, dataInicio: Date, dataFim: Date | null, hoje: Date) {
  const fim = dataFim ?? hoje;
  const dias = daysBetween(dataInicio, fim);
  // Taxa e "% ao mes" (mesma convencao do mes comercial de 30 dias usada nos
  // Emprestimos - RATE_BASIS_DAYS.MENSAL), entao os juros sao proporcionais
  // aos dias em que o valor esteve de fato utilizado, nao a taxa mensal cheia.
  const juros = Number((valorUtilizado * (taxaJurosPercent / 100) * (dias / 30)).toFixed(2));
  const iof = Number((valorUtilizado * (IOF_DIARIO_PERCENT / 100) * dias).toFixed(2));
  const iofAdicional = Number((valorUtilizado * (IOF_ADICIONAL_PERCENT / 100)).toFixed(2));
  const valorAPagar = Number((juros + iof + iofAdicional).toFixed(2));
  return { dias, juros, iof, iofAdicional, valorAPagar };
}

export async function getContasGarantidas() {
  const contas = await prisma.contaGarantida.findMany({
    include: { bank: true, usos: { orderBy: { dataInicio: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  return contas.map((c) => {
    const limiteContratado = n(c.limiteContratado);
    const taxaJurosPercent = n(c.taxaJurosPercent);

    const usos = c.usos.map((u) => {
      const valorUtilizado = n(u.valorUtilizado);
      const dataInicio = u.dataInicio;
      const dataFim = u.dataFim;
      const calc = calcUso(valorUtilizado, taxaJurosPercent, dataInicio, dataFim, hoje);
      // jurosReal/iofReal: valores reais informados (ex: extrato do banco) no
      // lugar do calculo - usado para importar historico onde o juros/IOF
      // exato ja e conhecido, sem depender da taxa contratada atual. Quando
      // iofReal esta preenchido, iofAdicional nao se aplica separado (ja
      // esta embutido no valor informado).
      const jurosReal = u.jurosReal != null ? n(u.jurosReal) : null;
      const iofReal = u.iofReal != null ? n(u.iofReal) : null;
      const juros = jurosReal ?? calc.juros;
      const iof = iofReal ?? calc.iof;
      const iofAdicional = iofReal != null ? 0 : calc.iofAdicional;
      const valorAPagar = Number((juros + iof + iofAdicional).toFixed(2));
      return {
        id: u.id,
        valorUtilizado,
        dataInicio: dataInicio.toISOString().slice(0, 10),
        dataFim: dataFim ? dataFim.toISOString().slice(0, 10) : null,
        emAberto: dataFim === null,
        dias: calc.dias,
        juros,
        iof,
        iofAdicional,
        valorAPagar,
        observacao: u.observacao,
      };
    });

    // So usos ainda em aberto (sem data de fim) consomem o limite disponivel
    // hoje - um uso ja encerrado significa que o valor foi devolvido.
    const valorUtilizado = Number(usos.filter((u) => u.emAberto).reduce((s, u) => s + u.valorUtilizado, 0).toFixed(2));
    const valorDisponivel = Number((limiteContratado - valorUtilizado).toFixed(2));
    const jurosPeriodo = Number(usos.reduce((s, u) => s + u.juros, 0).toFixed(2));
    const iofPeriodo = Number(usos.reduce((s, u) => s + u.iof, 0).toFixed(2));
    const iofAdicionalPeriodo = Number(usos.reduce((s, u) => s + u.iofAdicional, 0).toFixed(2));
    const valorAPagarPeriodo = Number(usos.reduce((s, u) => s + u.valorAPagar, 0).toFixed(2));

    return {
      id: c.id,
      bankId: c.bankId,
      bankName: c.bank.name,
      bankColor: c.bank.color,
      limiteContratado,
      valorUtilizado,
      valorDisponivel,
      taxaJurosPercent,
      jurosPeriodo,
      iofPeriodo,
      iofAdicionalPeriodo,
      valorAPagarPeriodo,
      observacao: c.observacao,
      updatedAt: c.updatedAt.toISOString(),
      usos,
    };
  });
}

export type ContaGarantidaRow = Awaited<ReturnType<typeof getContasGarantidas>>[number];
export type ContaGarantidaUsoRow = ContaGarantidaRow["usos"][number];

export async function getLoans() {
  const loans = await prisma.loan.findMany({
    include: { bank: true, installmentRecords: true },
    orderBy: { contractDate: "desc" },
  });
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  return loans.map((l) => {
    const contractedValue = n(l.contractedValue);
    const interestRate = n(l.interestRate);
    const iof = n(l.iof);
    const insuranceCost = n(l.insuranceCost);
    const otherCosts = n(l.otherCosts);

    const contractDateStr = l.contractDate.toISOString().slice(0, 10);
    const firstDueDateStr = l.firstDueDate.toISOString().slice(0, 10);
    const lastDueDateStr = l.lastDueDate.toISOString().slice(0, 10);
    const settlementDateStr = l.settlementDate ? l.settlementDate.toISOString().slice(0, 10) : null;
    const hojeStr = hoje.toISOString().slice(0, 10);

    const parcelas = l.installmentRecords.map((r) => ({
      numero: r.numero,
      vencimento: r.vencimento ? r.vencimento.toISOString().slice(0, 10) : null,
      paidAt: r.paidAt ? r.paidAt.toISOString().slice(0, 10) : null,
      paidValue: r.paidValue != null ? n(r.paidValue) : null,
    }));

    // Prazo: liquidado, ate a liquidacao; senao, o prazo contratado. A data de
    // liquidacao so vale com status LIQUIDADO (mesma regra de saldoDevedorEm).
    const liquidado = l.status === "LIQUIDADO";
    const fimPeriodo = liquidado && l.settlementDate ? l.settlementDate : l.lastDueDate;
    const prazoMeses = monthsBetween(l.contractDate, fimPeriodo);

    // Juros pelo cronograma de amortizacao (saldo devedor caindo a cada parcela),
    // com o valor real das parcelas pagas e, se liquidado, cortado na liquidacao -
    // ver calcLoanJurosReais. Antes era valor contratado cheio x taxa x prazo,
    // que superestimava os juros de SAC/PRICE e ignorava o que foi pago de fato.
    const juros = calcLoanJurosReais(
      {
        contractedValue,
        interestRate,
        rateBasis: l.rateBasis,
        installments: l.installments,
        contractDate: contractDateStr,
        firstDueDate: firstDueDateStr,
        lastDueDate: lastDueDateStr,
        amortizationSystem: l.amortizationSystem,
        status: l.status,
        settlementDate: settlementDateStr,
      },
      parcelas,
      hojeStr
    );
    const jurosValor = juros.jurosTotal;
    const jurosPago = juros.jurosPago;
    const custoTotal = Number((jurosValor + iof + insuranceCost + otherCosts).toFixed(2));

    // Juros/custo corridos ate hoje (ou ate a liquidacao, se ja liquidado).
    // E o que aparece na tabela de Emprestimos - nao inclui juros que ainda nao correram.
    const jurosAcumulado = juros.jurosAcumulado;
    const custoAcumulado = Number((jurosAcumulado + iof + insuranceCost + otherCosts).toFixed(2));

    // Saldo devedor real (respeita o sistema de amortizacao - PRICE/SAC/BULLET -
    // em vez de um percentual fixo). Zero se ja liquidado.
    const saldoDevedorAtual = saldoDevedorEm(
      {
        contractedValue,
        interestRate,
        rateBasis: l.rateBasis,
        installments: l.installments,
        contractDate: contractDateStr,
        firstDueDate: firstDueDateStr,
        lastDueDate: lastDueDateStr,
        amortizationSystem: l.amortizationSystem,
        status: l.status,
        settlementDate: settlementDateStr,
      },
      hojeStr
    );

    return {
      id: l.id,
      bankId: l.bankId,
      bankName: l.bank.name,
      contractNumber: l.contractNumber,
      purpose: l.purpose,
      contractedValue,
      netValue: n(l.netValue),
      interestRate,
      rateBasis: l.rateBasis,
      indexer: l.indexer,
      spread: n(l.spread),
      amortizationSystem: l.amortizationSystem,
      contractDate: contractDateStr,
      firstDueDate: firstDueDateStr,
      lastDueDate: lastDueDateStr,
      settlementDate: settlementDateStr,
      installments: l.installments,
      periodicity: l.periodicity,
      guarantee: l.guarantee,
      iof,
      hasInsurance: l.hasInsurance,
      insuranceCost,
      otherCosts,
      prazoMeses,
      jurosValor,
      jurosPago,
      custoTotal,
      jurosAcumulado,
      custoAcumulado,
      saldoDevedorAtual,
      status: l.status,
      parcelas,
    };
  });
}

export async function getAccOperations() {
  const ops = await prisma.accOperation.findMany({
    include: { bank: true, baixas: { orderBy: { dataQuitacao: "asc" } } },
    orderBy: { contractDate: "desc" },
  });
  return ops.map((a) => {
    const receivedValueBRL = n(a.receivedValueBRL);
    const contractedValueForeign = n(a.contractedValueForeign);
    const spotRate = n(a.spotRate);
    const interestRate = n(a.interestRate);
    // Spread cambial em % da taxa spot: (spot - fechamento) / spot. A coluna
    // gravada (fechamento - spot, em R$/US$) era exibida como se fosse %, com
    // sinal invertido (ex.: 4,982 - 4,990 = -0,008 aparecia como "-0,01%"; o
    // certo e 0,16%). Spread e custo, nunca negativo.
    const exchangeSpread = spotRate > 0 ? Math.max(0, Number((((spotRate - n(a.closingRate)) / spotRate) * 100).toFixed(4))) : 0;
    const iof = n(a.iof);
    const bankFees = n(a.bankFees);
    const flatFeeRate = n(a.flatFeeRate);
    const insuranceCost = n(a.insuranceCost);
    const otherCosts = n(a.otherCosts);

    const closingRate = n(a.closingRate);
    const exchangeVariationValue = n(a.exchangeVariationValue);
    const contractDateStr = a.contractDate.toISOString().slice(0, 10);

    // Prazo contratado: da contratacao ate o vencimento (estimativa fixa do contrato).
    // Juros comerciais em dias corridos, ano base de 360 dias.
    const prazoMeses = monthsBetween(a.contractDate, a.settlementDate);
    const prazoDias = daysBetween(a.contractDate, a.settlementDate);
    const jurosValorUSD = Number(
      (contractedValueForeign * (interestRate / 100) * (prazoDias / DIAS_ANO_BASE)).toFixed(2)
    );
    const jurosValor = Number((jurosValorUSD * closingRate).toFixed(2));

    // Baixas parciais: quitacao do ACC em tranches, cada uma com seu proprio
    // valor/data/cambio - os juros de cada tranche sao calculados
    // individualmente (mesma formula de jurosValorUSD, mas sobre o valor e o
    // prazo real daquela tranche), em vez de um calculo unico sobre o saldo
    // total. Ver lib/acc-calc.ts.
    const baixas = a.baixas.map((b) => {
      const valorUSD = n(b.valorUSD);
      const dataQuitacaoStr = b.dataQuitacao.toISOString().slice(0, 10);
      const baixaClosingRate = n(b.closingRate);
      const { dias, jurosUSD } = calcBaixaJuros(valorUSD, interestRate, contractDateStr, dataQuitacaoStr);
      return {
        id: b.id,
        valorUSD,
        dataQuitacao: dataQuitacaoStr,
        closingRate: baixaClosingRate,
        dias,
        jurosUSD,
        jurosValor: Number((jurosUSD * baixaClosingRate).toFixed(2)),
      };
    });
    const valorLiquidadoUSD = Number(baixas.reduce((s, b) => s + b.valorUSD, 0).toFixed(2));
    const saldoAbertoUSD =
      a.status === "LIQUIDADO"
        ? 0
        : Math.max(0, Number((contractedValueForeign - valorLiquidadoUSD).toFixed(2)));

    // Juros pelos valores efetivamente quitados. Cada baixa e uma tranche com
    // seu proprio prazo e cambio. Liquidado, o que nao foi coberto por baixas
    // (o ACC inteiro, se nao ha baixas) e quitado na data de quitacao
    // (closingDate, ou o vencimento se vazia), convertido pela taxa de
    // quitacao informada (exchangeVariationValue; vazia, o cambio da ultima
    // baixa ou, sem baixas, a taxa de fechamento) - antes, liquidado com
    // baixas parciais, esse saldo restante ficava sem juros nenhum.
    // Em aberto, o saldo ainda nao quitado entra no custo como projecao ate o
    // vencimento, na taxa de fechamento - custo total continua sendo o custo
    // esperado da operacao inteira, mas jurosPagoValor so conta o que ja foi pago.
    const liquidado = a.status === "LIQUIDADO";
    const saldoNaoBaixadoUSD = Math.max(0, Number((contractedValueForeign - valorLiquidadoUSD).toFixed(2)));
    const taxaQuitacao =
      exchangeVariationValue > 0
        ? exchangeVariationValue
        : baixas.length > 0
          ? baixas[baixas.length - 1].closingRate
          : closingRate;
    let jurosPagoUSD = Number(baixas.reduce((s, b) => s + b.jurosUSD, 0).toFixed(2));
    let jurosPagoValor = Number(baixas.reduce((s, b) => s + b.jurosValor, 0).toFixed(2));
    let jurosProjetadoRestanteValor = 0;
    let jurosQuitacaoFinalValor = 0;
    let taxaConversaoJurosPagos = baixas.length > 0 ? baixas[baixas.length - 1].closingRate : taxaQuitacao;
    if (saldoNaoBaixadoUSD > 0.005) {
      if (liquidado) {
        const dataQuitacaoFinal = (a.closingDate ?? a.settlementDate).toISOString().slice(0, 10);
        const { jurosUSD } = calcBaixaJuros(saldoNaoBaixadoUSD, interestRate, contractDateStr, dataQuitacaoFinal);
        jurosPagoUSD = Number((jurosPagoUSD + jurosUSD).toFixed(2));
        jurosQuitacaoFinalValor = Number((jurosUSD * taxaQuitacao).toFixed(2));
        jurosPagoValor = Number((jurosPagoValor + jurosQuitacaoFinalValor).toFixed(2));
        taxaConversaoJurosPagos = taxaQuitacao;
      } else {
        const jurosRestanteUSD = saldoNaoBaixadoUSD * (interestRate / 100) * (prazoDias / DIAS_ANO_BASE);
        jurosProjetadoRestanteValor = Number((jurosRestanteUSD * closingRate).toFixed(2));
      }
    }
    // Componente de juros usado no custo total: pago + projecao do que falta.
    const jurosCustoValor = Number((jurosPagoValor + jurosProjetadoRestanteValor).toFixed(2));

    // Valor do spread: valor contratado x (taxa spot - taxa de fechamento).
    // Calculado direto pelas taxas, e nao contra receivedValueBRL, porque o
    // valor recebido e gravado arredondado ao real - quando spot = fechamento
    // isso gerava spread negativo de centavos (ex.: -R$0,50). Spread e custo,
    // nunca negativo: travado em zero.
    const spreadValor = Math.max(0, Number((contractedValueForeign * (spotRate - closingRate)).toFixed(2)));

    // Taxa flat: percentual cobrado sobre o valor total liberado (receivedValueBRL).
    const flatFeeValor = Number((receivedValueBRL * (flatFeeRate / 100)).toFixed(2));

    // Custo total: spread + juros (pagos ou projetados, ver jurosCustoValor) + IOF
    // + tarifas + taxa flat + seguro + outras despesas.
    const custoTotal = Number(
      (spreadValor + jurosCustoValor + iof + bankFees + flatFeeValor + insuranceCost + otherCosts).toFixed(2)
    );

    // Percentual final do juros do contrato: custo total / valor recebido.
    const percentualCustoTotal = receivedValueBRL > 0 ? (custoTotal / receivedValueBRL) * 100 : 0;

    return {
      id: a.id,
      bankId: a.bankId,
      bankName: a.bank.name,
      accNumber: a.accNumber,
      exchangeContractNumber: a.exchangeContractNumber,
      exporter: a.exporter,
      country: a.country,
      currency: a.currency,
      contractedValueForeign,
      receivedValueBRL,
      spotRate,
      closingRate: n(a.closingRate),
      ptaxContracting: n(a.ptaxContracting),
      exchangeSpread,
      exchangeVariationValue,
      taxaConversaoJurosPagos,
      spreadValor,
      interestRate,
      iof,
      bankFees,
      flatFeeRate,
      flatFeeValor,
      hasInsurance: a.hasInsurance,
      insuranceCost,
      otherCosts,
      prazoMeses,
      jurosValorUSD,
      jurosValor,
      jurosPagoUSD,
      jurosPagoValor,
      jurosProjetadoRestanteValor,
      jurosCustoValor,
      jurosQuitacaoFinalValor,
      custoTotal,
      percentualCustoTotal: Number(percentualCustoTotal.toFixed(2)),
      contractDate: contractDateStr,
      settlementDate: a.settlementDate.toISOString().slice(0, 10),
      dataQuitacao: a.closingDate ? a.closingDate.toISOString().slice(0, 10) : null,
      status: a.status,
      baixas,
      valorLiquidadoUSD,
      saldoAbertoUSD,
    };
  });
}

export type LoanRow = Awaited<ReturnType<typeof getLoans>>[number];
export type AccRow = Awaited<ReturnType<typeof getAccOperations>>[number];

export async function getKpis(range?: PeriodRange, modalidade?: ModalidadeFilter) {
  const [allLoans, allAccOperations] = await Promise.all([getLoans(), getAccOperations()]);
  const filtered = applyModalidade(
    filterByPeriod(allLoans, range),
    filterByPeriod(allAccOperations, range),
    modalidade
  );
  const loans = filtered.loans;
  const accOperations = filtered.accOperations;

  // Saldo devedor real dos emprestimos: soma o saldo que a amortizacao (PRICE/SAC/
  // BULLET) diz que ainda resta hoje, nao um percentual fixo do valor contratado.
  const saldoDevedorLoans = loans.reduce((sum, l) => sum + l.saldoDevedorAtual, 0);
  // ACC em aberto: saldo ainda nao baixado (contratado - baixas parciais), em
  // R$ pela taxa de fechamento do contrato - mesma base do relatorio "em aberto".
  const accAbertos = accOperations.filter((a) => a.status !== "LIQUIDADO");
  const saldoDevedorAcc = Number(accAbertos.reduce((sum, a) => sum + a.saldoAbertoUSD * a.closingRate, 0).toFixed(2));
  const saldoDevedorAccUsd = Number(accAbertos.reduce((sum, a) => sum + a.saldoAbertoUSD, 0).toFixed(2));
  const saldoDevedorTotal = saldoDevedorLoans + saldoDevedorAcc;

  const totalContratado = loans.reduce((sum, l) => sum + l.contractedValue, 0);
  // Total contratado da carteira inteira (emprestimos + ACC), usado no KPI geral do
  // dashboard - "totalContratado" sozinho e so emprestimos (usado no grafico de
  // distribuicao por modalidade, onde precisa ficar separado do ACC).
  const totalAccContratado = accOperations.reduce((sum, a) => sum + a.receivedValueBRL, 0);
  const totalContratadoGeral = totalContratado + totalAccContratado;

  // Juros pagos: o que ja foi efetivamente pago em todas as operacoes - parcelas
  // pagas de emprestimos ativos e baixas parciais de ACC em aberto inclusive,
  // nao so as operacoes ja liquidadas.
  const jurosPagos =
    loans.reduce((sum, l) => sum + l.jurosPago, 0) +
    accOperations.reduce((sum, a) => sum + a.jurosPagoValor, 0);
  // Juros futuros: o que ainda falta correr (total do contrato menos o que ja
  // correu ate hoje) nos emprestimos e, no ACC, a projecao do saldo ainda nao
  // quitado ate o vencimento (sem repetir o que ja foi pago em baixas).
  const jurosFuturos =
    loans
      .filter((l) => l.status !== "LIQUIDADO")
      .reduce((sum, l) => sum + Math.max(0, l.jurosValor - l.jurosAcumulado), 0) +
    accOperations
      .filter((a) => a.status !== "LIQUIDADO")
      .reduce((sum, a) => sum + a.jurosProjetadoRestanteValor, 0);

  // Exposicao cambial em US$ (moeda do risco), nao convertida para R$. Usa o
  // saldo real em aberto (contratado - ja liquidado em baixas), nao o valor
  // contratado cheio - senao superestima a exposicao apos quitacoes parciais.
  // EM_ATRASO tambem e exposicao: o adiantamento continua sem liquidar.
  const exposicaoCambial = saldoDevedorAccUsd;

  // Custo medio ponderado da carteira: custo total / principal, ponderado pelo valor de
  // cada operacao (nao e uma media simples das taxas). Metrica-chave para o CFO.
  const custoTotalCarteira =
    loans.reduce((sum, l) => sum + l.custoTotal, 0) +
    accOperations.reduce((sum, a) => sum + a.custoTotal, 0);
  const principalCarteira =
    loans.reduce((sum, l) => sum + l.contractedValue, 0) +
    accOperations.reduce((sum, a) => sum + a.receivedValueBRL, 0);
  const custoMedioPonderado =
    principalCarteira > 0 ? Number(((custoTotalCarteira / principalCarteira) * 100).toFixed(2)) : 0;

  // Concentracao no maior banco: quanto do total captado esta com um unico banco.
  const captadoPorBanco = new Map<string, number>();
  for (const l of loans) {
    captadoPorBanco.set(l.bankId, (captadoPorBanco.get(l.bankId) ?? 0) + l.contractedValue);
  }
  for (const a of accOperations) {
    captadoPorBanco.set(a.bankId, (captadoPorBanco.get(a.bankId) ?? 0) + a.receivedValueBRL);
  }
  const maiorCaptacaoBanco = Math.max(0, ...captadoPorBanco.values());
  const concentracaoMaiorBanco =
    principalCarteira > 0 ? Number(((maiorCaptacaoBanco / principalCarteira) * 100).toFixed(1)) : 0;

  return {
    saldoDevedorTotal,
    saldoDevedorLoans,
    saldoDevedorAcc,
    saldoDevedorAccUsd,
    totalContratado,
    totalContratadoGeral,
    custoMedioPonderado,
    concentracaoMaiorBanco,
    jurosPagos,
    jurosFuturos,
    operacoesAtivas: loans.filter((l) => l.status === "ATIVO").length + accOperations.filter((a) => a.status === "EM_ABERTO").length,
    operacoesLiquidadas: loans.filter((l) => l.status === "LIQUIDADO").length + accOperations.filter((a) => a.status === "LIQUIDADO").length,
    operacoesAtraso: loans.filter((l) => l.status === "EM_ATRASO").length + accOperations.filter((a) => a.status === "EM_ATRASO").length,
    totalAccContratado,
    exposicaoCambial,
  };
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthsBack(count: number, from = new Date()) {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

// Gera todos os meses entre o mais antigo contrato cadastrado (emprestimo ou ACC) e o mes atual,
// para que o historico reflita todos os dados cadastrados em vez de uma janela fixa recente.
function monthsSinceEarliest(dates: string[]) {
  const currentMonth = monthKey(new Date().toISOString());
  if (dates.length === 0) return [currentMonth];

  const earliestMonth = dates.map(monthKey).sort()[0];
  const [startYear, startMonthNum] = earliestMonth.split("-").map(Number);
  const [endYear, endMonthNum] = currentMonth.split("-").map(Number);

  const totalMonths = (endYear - startYear) * 12 + (endMonthNum - startMonthNum) + 1;
  return monthsBack(Math.max(totalMonths, 1));
}

// Saldo devedor real mes a mes: soma do principal de contratos ja assinados e ainda dentro
// do prazo (contractDate <= mes <= vencimento), para emprestimos e ACC.
export async function getDebtEvolution(range?: PeriodRange, modalidade?: ModalidadeFilter) {
  const [allLoans, allAccOperations] = await Promise.all([getLoans(), getAccOperations()]);
  const { loans, accOperations } = applyModalidade(allLoans, allAccOperations, modalidade);
  const fullRange = monthsSinceEarliest([
    ...loans.map((l) => l.contractDate),
    ...accOperations.map((a) => a.contractDate),
  ]);
  const from = range?.from ?? fullRange[0];
  const to = range?.to ?? fullRange[fullRange.length - 1];
  const months = monthsInRange(from, to);

  return months.map((month) => {
    const dataRef = endOfMonthStr(month);
    // Saldo real da amortizacao (PRICE/SAC declinam mes a mes, BULLET fica cheio ate
    // o fim) - nao o valor contratado inteiro ate o vencimento.
    const saldoLoans = loans
      .filter((l) => l.contractDate.slice(0, 7) <= month)
      .reduce((sum, l) => sum + saldoDevedorEm(l, dataRef), 0);
    const saldoAcc = accOperations.reduce((sum, a) => sum + saldoAccEm(a, dataRef), 0);

    return { month, saldoDevedor: Math.round(saldoLoans + saldoAcc) };
  });
}

// Saldo de um ACC (R$, taxa de fechamento) no fim do dia dataRef: contratado
// menos as baixas ate a data; zero depois da quitacao (liquidado). Em aberto
// depois do vencimento continua devendo - nao some do saldo.
function saldoAccEm(a: AccRow, dataRef: string) {
  if (a.contractDate > dataRef) return 0;
  if (a.status === "LIQUIDADO" && (a.dataQuitacao ?? a.settlementDate) <= dataRef) return 0;
  const baixado = a.baixas.filter((b) => b.dataQuitacao <= dataRef).reduce((s, b) => s + b.valorUSD, 0);
  return Math.max(0, a.contractedValueForeign - baixado) * a.closingRate;
}

// Proximos 12 meses a partir do mes atual (titulo do grafico no dashboard).
function proximos12Meses() {
  const hoje = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

// Fluxo de pagamentos por mes. Entradas: valor captado na contratacao.
// Saidas (principal + juros), nas datas reais quando ja pagas:
// - emprestimo: cada parcela do cronograma (valor pago registrado, ou o do
//   cronograma), cortado na liquidacao (pagamentosLoanReais);
// - ACC: cada baixa (valor x taxa de fechamento + juros da tranche) e o saldo
//   restante na quitacao (liquidado) ou no vencimento (em aberto, com os juros
//   projetados).
// Antes: saida do emprestimo = principal / parcelas, sem juros, e sumia ao
// liquidar; ACC = valor recebido no vencimento contratual, sem juros.
export async function getCashFlow(range?: PeriodRange, modalidade?: ModalidadeFilter) {
  const [allLoans, allAccOperations] = await Promise.all([getLoans(), getAccOperations()]);
  const { loans, accOperations } = applyModalidade(allLoans, allAccOperations, modalidade);
  const padrao = proximos12Meses();
  const months = range?.from || range?.to ? monthsInRange(range.from ?? padrao[0], range.to ?? padrao[11]) : padrao;

  const entradas = new Map<string, number>();
  const saidas = new Map<string, number>();
  const add = (m: Map<string, number>, data: string, v: number) => m.set(data.slice(0, 7), (m.get(data.slice(0, 7)) ?? 0) + v);

  for (const l of loans) {
    add(entradas, l.contractDate, l.contractedValue);
    for (const p of pagamentosLoanReais(l, l.parcelas)) add(saidas, p.data, p.valor);
  }
  for (const a of accOperations) {
    add(entradas, a.contractDate, a.receivedValueBRL);
    for (const b of a.baixas) add(saidas, b.dataQuitacao, b.valorUSD * a.closingRate + b.jurosValor);
    const restanteUSD = Math.max(0, a.contractedValueForeign - a.valorLiquidadoUSD);
    if (restanteUSD > 0.005) {
      if (a.status === "LIQUIDADO") {
        add(saidas, a.dataQuitacao ?? a.settlementDate, restanteUSD * a.closingRate + a.jurosQuitacaoFinalValor);
      } else {
        add(saidas, a.settlementDate, restanteUSD * a.closingRate + a.jurosProjetadoRestanteValor);
      }
    }
  }

  return months.map((month) => ({
    month,
    entradas: Math.round(entradas.get(month) ?? 0),
    saidas: Math.round(saidas.get(month) ?? 0),
  }));
}

// Medias ponderadas pelo valor de cada contrato (nao uma media simples das taxas),
// calculadas sobre os contratos individuais do periodo (nao sobre a media mensal ja
// agregada). Taxas anualizadas para poder comparar/misturar bases diferentes.
export async function getRateSummary(range?: PeriodRange) {
  const [loans, accOperations] = await Promise.all([getLoans(), getAccOperations()]);

  const loansInPeriod = filterByPeriod(loans, range);
  const accInPeriod = filterByPeriod(accOperations, range);
  const loanRatesAnual = loansInPeriod.map((l) => annualizedRate(l.interestRate, l.rateBasis));
  const accRates = accInPeriod.map((a) => a.interestRate);
  const allRates = [...loanRatesAnual, ...accRates];

  return {
    loanAvgRate: Number(
      weightedAvg(loansInPeriod.map((l, i) => ({ rate: loanRatesAnual[i], weight: l.contractedValue }))).toFixed(2)
    ),
    accAvgRate: Number(
      weightedAvg(accInPeriod.map((a) => ({ rate: a.interestRate, weight: a.receivedValueBRL }))).toFixed(2)
    ),
    minRate: allRates.length ? Number(Math.min(...allRates).toFixed(2)) : 0,
    maxRate: allRates.length ? Number(Math.max(...allRates).toFixed(2)) : 0,
  };
}

// Ultimo dia de um mes "YYYY-MM", como "YYYY-MM-DD".
function endOfMonthStr(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

function monthsInRange(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const out: string[] = [];
  let year = fromYear;
  let month = fromMonth;
  while (year < toYear || (year === toYear && month <= toMonth)) {
    out.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return out;
}

export async function getRateHistory(range?: PeriodRange) {
  const [loans, accOperations] = await Promise.all([getLoans(), getAccOperations()]);
  const fullRange = monthsSinceEarliest([
    ...loans.map((l) => l.contractDate),
    ...accOperations.map((a) => a.contractDate),
  ]);
  const from = range?.from ?? fullRange[0];
  const to = range?.to ?? fullRange[fullRange.length - 1];
  const months = monthsInRange(from, to);

  return months.map((month) => {
    const loansInMonth = loans.filter((l) => monthKey(l.contractDate) === month);
    const accInMonth = accOperations.filter((a) => monthKey(a.contractDate) === month);

    // Taxa media ponderada pelo valor de cada contrato (nao uma media simples), com
    // a taxa dos emprestimos anualizada para poder misturar bases diferentes.
    // Mes sem contrato fica null (lacuna no grafico), nao 0% - zero sugeriria
    // uma taxa contratada a zero.
    const loanAvgRate = loansInMonth.length
      ? weightedAvg(loansInMonth.map((l) => ({ rate: annualizedRate(l.interestRate, l.rateBasis), weight: l.contractedValue })))
      : null;
    const accAvgRate = accInMonth.length
      ? weightedAvg(accInMonth.map((a) => ({ rate: a.interestRate, weight: a.receivedValueBRL })))
      : null;
    const cambio = mediasCambioAcc(accInMonth);

    // Custo financeiro efetivo: custo total / principal, ponderado, para emprestimos e ACC
    // contratados no mes (reflete o custo real, nao um peso arbitrario entre as taxas).
    const custoTotalMes =
      loansInMonth.reduce((s, l) => s + l.custoTotal, 0) +
      accInMonth.reduce((s, a) => s + a.custoTotal, 0);
    const principalMes =
      loansInMonth.reduce((s, l) => s + l.contractedValue, 0) +
      accInMonth.reduce((s, a) => s + a.receivedValueBRL, 0);
    const financialCost = principalMes > 0 ? (custoTotalMes / principalMes) * 100 : null;
    const r = (v: number | null, d: number) => (v === null ? null : Number(v.toFixed(d)));

    return {
      month,
      loanAvgRate: r(loanAvgRate, 2),
      accAvgRate: r(accAvgRate, 2),
      ptax: r(cambio.ptax, 4),
      spotAvg: r(cambio.spot, 4),
      closingAvg: r(cambio.fechamento, 4),
      cambialSpread: r(cambio.spread, 4),
      financialCost: r(financialCost, 2),
    };
  });
}

export async function getYearlyComparison(modalidade?: ModalidadeFilter) {
  const [allLoans, allAccOperations] = await Promise.all([getLoans(), getAccOperations()]);
  const { loans, accOperations } = applyModalidade(allLoans, allAccOperations, modalidade);

  const years = Array.from(
    new Set([
      ...loans.map((l) => l.contractDate.slice(0, 4)),
      ...accOperations.map((a) => a.contractDate.slice(0, 4)),
    ])
  ).sort();

  return years.map((year) => {
    const loansInYear = loans.filter((l) => l.contractDate.slice(0, 4) === year);
    const accInYear = accOperations.filter((a) => a.contractDate.slice(0, 4) === year);

    const totalCaptado =
      loansInYear.reduce((s, l) => s + l.contractedValue, 0) +
      accInYear.reduce((s, a) => s + a.receivedValueBRL, 0);
    const custoTotalAno =
      loansInYear.reduce((s, l) => s + l.custoTotal, 0) +
      accInYear.reduce((s, a) => s + a.custoTotal, 0);
    const custoMedio = totalCaptado > 0 ? (custoTotalAno / totalCaptado) * 100 : 0;

    const cambio = mediasCambioAcc(accInYear);
    const r = (v: number | null, d: number) => (v === null ? null : Number(v.toFixed(d)));
    // Ano sem contrato de um tipo: null (sem barra), nao 0%.
    return {
      year,
      loanAvgRate: loansInYear.length
        ? r(weightedAvg(loansInYear.map((l) => ({ rate: annualizedRate(l.interestRate, l.rateBasis), weight: l.contractedValue }))), 2)
        : null,
      accAvgRate: accInYear.length
        ? r(weightedAvg(accInYear.map((a) => ({ rate: a.interestRate, weight: a.receivedValueBRL }))), 2)
        : null,
      totalCaptado: Math.round(totalCaptado),
      custoMedio: Number(custoMedio.toFixed(2)),
      qtdOperacoes: loansInYear.length + accInYear.length,
      spotMedio: r(cambio.spot, 4),
      fechamentoMedio: r(cambio.fechamento, 4),
      spreadMedio: r(cambio.spread, 4),
      ptaxMedia: r(cambio.ptax, 4),
    };
  });
}

// Comparativo anual para um conjunto fixo de anos (usado na pagina Emprestimo e
// ACC, dentro de Faturamento) - ao contrario de getYearlyComparison, os anos nao
// vem de "quais anos tem contrato", entao um ano sem nenhum contrato novo mas com
// quitacoes ainda aparece. Creditos tomados agrupa por ano de contratacao; valores
// quitados agrupa por ano de quitacao (settlementDate do emprestimo / dataQuitacao
// do ACC) - sao dois recortes de data diferentes de proposito.
// Valor contratado por mes no ano (emprestimos pelo valor contratado, ACC pelo
// valor recebido em R$ - mesma base do "Creditos Tomados" do comparativo anual).
export async function getEmprestimoAccContratacaoMensal(year: string) {
  const [loans, accOperations] = await Promise.all([getLoans(), getAccOperations()]);
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${year}-${String(i + 1).padStart(2, "0")}`;
    const emprestimos = loans.filter((l) => l.contractDate.slice(0, 7) === mes).reduce((s, l) => s + l.contractedValue, 0);
    const acc = accOperations.filter((a) => a.contractDate.slice(0, 7) === mes).reduce((s, a) => s + a.receivedValueBRL, 0);
    return { mes, emprestimos: Math.round(emprestimos), acc: Math.round(acc), total: Math.round(emprestimos + acc) };
  });
}

export async function getEmprestimoAccComparativoAnual(years: string[]) {
  const [loans, accOperations] = await Promise.all([getLoans(), getAccOperations()]);

  return years.map((year) => {
    const loansContratadosNoAno = loans.filter((l) => l.contractDate.slice(0, 4) === year);
    const accContratadosNoAno = accOperations.filter((a) => a.contractDate.slice(0, 4) === year);

    const totalCaptado =
      loansContratadosNoAno.reduce((s, l) => s + l.contractedValue, 0) +
      accContratadosNoAno.reduce((s, a) => s + a.receivedValueBRL, 0);

    // Custo total (juros + IOF + tarifas + demais encargos) dos contratos
    // tomados no ano - emprestimos e ACC somados.
    const custoTotal =
      loansContratadosNoAno.reduce((s, l) => s + l.custoTotal, 0) +
      accContratadosNoAno.reduce((s, a) => s + a.custoTotal, 0);
    // Custo total / valor captado no ano - ja ponderado por natureza (razao entre
    // dois totais), sem precisar de pesos separados por contrato.
    const custoMedioPonderado = totalCaptado > 0 ? Number(((custoTotal / totalCaptado) * 100).toFixed(2)) : null;

    // null (em vez de 0) quando nao houve contrato no ano - 0,00% sugeriria uma
    // taxa contratada a zero, quando na verdade nao ha nenhuma operacao pra
    // calcular a media.
    const loanAvgRate =
      loansContratadosNoAno.length > 0
        ? Number(
            weightedAvg(
              loansContratadosNoAno.map((l) => ({
                rate: annualizedRate(l.interestRate, l.rateBasis),
                weight: l.contractedValue,
              }))
            ).toFixed(2)
          )
        : null;
    const accAvgRate =
      accContratadosNoAno.length > 0
        ? Number(
            weightedAvg(
              accContratadosNoAno.map((a) => ({ rate: a.interestRate, weight: a.receivedValueBRL }))
            ).toFixed(2)
          )
        : null;
    const spreadAno = mediasCambioAcc(accContratadosNoAno).spread;
    const spreadMedio = spreadAno === null ? null : Number(spreadAno.toFixed(4));
    // Valor efetivamente pago em spread cambial no ano (soma de spreadValor das
    // operacoes de ACC contratadas no ano), nao so o percentual medio.
    const valorSpread = Math.round(accContratadosNoAno.reduce((s, a) => s + a.spreadValor, 0));

    // Taxa media ponderada do ano: emprestimos e ACC juntos, ponderados pelo
    // valor de cada operacao (nao a media simples de loanAvgRate/accAvgRate).
    const taxaMediaPonderada =
      loansContratadosNoAno.length + accContratadosNoAno.length > 0
        ? Number(
            weightedAvg([
              ...loansContratadosNoAno.map((l) => ({
                rate: annualizedRate(l.interestRate, l.rateBasis),
                weight: l.contractedValue,
              })),
              ...accContratadosNoAno.map((a) => ({ rate: a.interestRate, weight: a.receivedValueBRL })),
            ]).toFixed(2)
          )
        : null;

    return {
      year,
      totalCaptado: Math.round(totalCaptado),
      custoTotal: Math.round(custoTotal),
      custoMedioPonderado,
      loanAvgRate,
      accAvgRate,
      taxaMediaPonderada,
      spreadMedio,
      valorSpread,
    };
  });
}

function quarterKey(date: string) {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${q}`;
}

export async function getRateHeatmap() {
  const loans = await getLoans();
  const banks = await getBanks();

  const quarters = Array.from(new Set(loans.map((l) => quarterKey(l.contractDate)))).sort();

  const rows = banks
    .map((bank) => {
      const bankLoans = loans.filter((l) => l.bankId === bank.id);
      if (bankLoans.length === 0) return null;
      const values = quarters.map((q) => {
        const inQuarter = bankLoans.filter((l) => quarterKey(l.contractDate) === q);
        // Trimestre sem contrato: null (celula vazia), nao 0%. Taxa anualizada e
        // ponderada pelo valor, como no resto da tela (bases mensal/anual misturadas).
        if (inQuarter.length === 0) return null;
        return Number(
          weightedAvg(inQuarter.map((l) => ({ rate: annualizedRate(l.interestRate, l.rateBasis), weight: l.contractedValue }))).toFixed(2)
        );
      });
      return { bank: bank.name, values };
    })
    .filter((r): r is { bank: string; values: (number | null)[] } => r !== null);

  return { rows, quarters };
}

export async function getBankComparison(range?: PeriodRange) {
  const [banks, allAccOperations] = await Promise.all([getBanks(), getAccOperations()]);
  const accOperations = filterByPeriod(allAccOperations, range);

  return banks.map((bank) => {
    const ops = accOperations.filter((a) => a.bankId === bank.id);
    const valorCaptado = ops.reduce((s, a) => s + a.receivedValueBRL, 0);
    const cambio = mediasCambioAcc(ops);
    const custoTotalGeral = Number(ops.reduce((s, a) => s + a.custoTotal, 0).toFixed(2));
    return {
      bankId: bank.id,
      bankName: bank.name,
      bankColor: bank.color,
      qtdAcc: ops.length,
      valorCaptado,
      // Medias ponderadas pelo valor de cada ACC (taxa pelo valor em R$; cambio
      // e spread pelo valor em US$), nao media simples entre contratos.
      taxaMedia: Number(weightedAvg(ops.map((a) => ({ rate: a.interestRate, weight: a.receivedValueBRL }))).toFixed(2)),
      spreadMedio: Number((cambio.spread ?? 0).toFixed(4)),
      spotMedio: Number((cambio.spot ?? 0).toFixed(4)),
      fechamentoMedio: Number((cambio.fechamento ?? 0).toFixed(4)),
      // Custo medio real: custo total / valor captado (custo efetivo ponderado pelo banco).
      custoMedio: valorCaptado > 0 ? Number(((custoTotalGeral / valorCaptado) * 100).toFixed(2)) : 0,
      // Totais absolutos (soma, nao media) para comparar o custo real pago a cada banco.
      // Custo total geral = spread + juros + IOF + tarifas + taxa flat + seguro + outros
      // (mesma definicao de custoTotal na tela de ACC); juros = pagos + projetados
      // dos ACC em aberto, para as colunas somarem o custo total.
      totalSpread: Number(ops.reduce((s, a) => s + a.spreadValor, 0).toFixed(2)),
      totalJuros: Number(ops.reduce((s, a) => s + a.jurosCustoValor, 0).toFixed(2)),
      totalIOF: Number(ops.reduce((s, a) => s + a.iof, 0).toFixed(2)),
      totalTarifas: Number(ops.reduce((s, a) => s + a.bankFees, 0).toFixed(2)),
      totalFlat: Number(ops.reduce((s, a) => s + a.flatFeeValor, 0).toFixed(2)),
      totalSeguro: Number(ops.reduce((s, a) => s + a.insuranceCost, 0).toFixed(2)),
      totalOutrosCustos: Number(ops.reduce((s, a) => s + a.otherCosts, 0).toFixed(2)),
      custoTotalGeral,
    };
  });
}

export async function getOpenLoansReport() {
  const loans = await getLoans();

  // valorEmAberto usa o mesmo saldoDevedorAtual (saldo real da amortizacao) usado no
  // dashboard, para os dois lugares baterem sempre com o mesmo numero.
  return loans
    .filter((l) => l.status !== "LIQUIDADO")
    .map((l) => ({
      id: l.id,
      bankName: l.bankName,
      contractNumber: l.contractNumber,
      contractDate: l.contractDate,
      valorTomado: l.contractedValue,
      valorEmAberto: l.saldoDevedorAtual,
      vencimento: l.lastDueDate,
      status: l.status,
      taxaJuros: l.interestRate,
      taxaBase: l.rateBasis,
      valorContratadoUsd: null as number | null,
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export async function getOpenAccReport() {
  const accOperations = await getAccOperations();

  // valorEmAberto usa o saldo real em aberto (saldoAbertoUSD convertido para R$ pela
  // taxa de fechamento do contrato) - cai conforme baixas parciais sao registradas,
  // em vez de mostrar sempre o valor recebido cheio.
  return accOperations
    .filter((a) => a.status !== "LIQUIDADO")
    .map((a) => ({
      id: a.id,
      bankName: a.bankName,
      contractNumber: a.accNumber,
      contractDate: a.contractDate,
      valorTomado: a.receivedValueBRL,
      valorEmAberto: Number((a.saldoAbertoUSD * a.closingRate).toFixed(2)),
      vencimento: a.settlementDate,
      status: a.status,
      taxaJuros: a.interestRate,
      taxaBase: "ANUAL" as const,
      valorContratadoUsd: a.contractedValueForeign as number | null,
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

// Mesmo formato do relatorio "em aberto", mas sem filtrar por status - traz
// todos os contratos (liquidados ou nao) cuja data de contratacao caia dentro
// do periodo informado, para o relatorio "por periodo" da tela de Relatorios.
export async function getLoansReport(range?: PeriodRange) {
  const loans = filterByPeriod(await getLoans(), range);

  return loans
    .map((l) => ({
      id: l.id,
      bankName: l.bankName,
      contractNumber: l.contractNumber,
      contractDate: l.contractDate,
      valorTomado: l.contractedValue,
      valorEmAberto: l.saldoDevedorAtual,
      vencimento: l.lastDueDate,
      status: l.status,
      taxaJuros: l.interestRate,
      taxaBase: l.rateBasis,
      valorContratadoUsd: null as number | null,
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export async function getAccReport(range?: PeriodRange) {
  const accOperations = filterByPeriod(await getAccOperations(), range);

  return accOperations
    .map((a) => ({
      id: a.id,
      bankName: a.bankName,
      contractNumber: a.accNumber,
      contractDate: a.contractDate,
      valorTomado: a.receivedValueBRL,
      valorEmAberto: Number((a.saldoAbertoUSD * a.closingRate).toFixed(2)),
      vencimento: a.settlementDate,
      status: a.status,
      taxaJuros: a.interestRate,
      taxaBase: "ANUAL" as const,
      valorContratadoUsd: a.contractedValueForeign as number | null,
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

const KG_POR_SACA = 60;

export async function getSales() {
  const sales = await prisma.sale.findMany({ orderBy: { saleDate: "desc" } });
  return sales.map((s) => {
    const quantityKg = n(s.quantityKg);
    return {
      id: s.id,
      clientName: s.clientName,
      clientType: s.clientType,
      quantityKg,
      quantitySacas: Number((quantityKg / KG_POR_SACA).toFixed(2)),
      country: s.country,
      containers20: s.containers20,
      containers40: s.containers40,
      saleDate: s.saleDate.toISOString().slice(0, 10),
      valueBRL: n(s.valueBRL),
      valueUSD: s.valueUSD != null ? n(s.valueUSD) : null,
      diferencial: s.diferencial != null ? n(s.diferencial) : null,
    };
  });
}

export type SaleRow = Awaited<ReturnType<typeof getSales>>[number];

// Nome de cliente normalizado para cruzar devolucao x venda: sem acento,
// pontuacao, caixa e sufixos societarios (SA, S/A, LTDA, ME, EIRELI).
function normalizarCliente(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\b(S A|SA|LTDA|ME|EIRELI|EPP)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Acha o cliente da venda correspondente ao nome digitado na devolucao. O
// cadastro de vendas traz o nome truncado (~32 caracteres) e as devolucoes vem
// com o nome completo ou abreviado de outro jeito, entao o nome exato falhava
// em 38 devolucoes (~R$ 15 mi): elas saiam do total geral mas nao do interno/
// externo nem do cliente. Ordem: nome exato; normalizado igual; um nome
// prefixo do outro (min. 12 letras); mesma primeira palavra e as duas primeiras
// palavras significativas contidas. So aceita quando o candidato e unico.
function resolverClienteVenda(nome: string, nomesVenda: string[], porNormalizado: Map<string, string>): string | null {
  if (nomesVenda.includes(nome)) return nome;
  const n = normalizarCliente(nome);
  const exato = porNormalizado.get(n);
  if (exato) return exato;
  const unico = (lista: string[]) => (lista.length === 1 ? porNormalizado.get(lista[0]) ?? null : null);
  const normalizados = [...porNormalizado.keys()];
  const prefixo = normalizados.filter((v) => Math.min(v.length, n.length) >= 12 && (v.startsWith(n) || n.startsWith(v)));
  if (prefixo.length) return unico(prefixo);
  const palavras = n.split(" ");
  const chaves = palavras.filter((w) => w.length > 3).slice(0, 2);
  const porPalavras = normalizados.filter((v) => v.split(" ")[0] === palavras[0] && chaves.every((w) => v.includes(w)));
  return unico(porPalavras);
}

export async function getSaleReturns() {
  // Devolucao nao guarda tipo de cliente/pais (a tabela so tem clientName):
  // resolve cruzando com o cadastro de Sale (resolverClienteVenda), para toda
  // tela que consome devolucao receber o segmento e o cliente certos.
  // clientNameVenda = nome do cliente como esta nas vendas (para abater a
  // devolucao do cliente certo nos rankings); clientName fica como digitado.
  const [returns, salesClients] = await Promise.all([
    prisma.saleReturn.findMany({ orderBy: { returnDate: "desc" } }),
    prisma.sale.findMany({ select: { clientName: true, clientType: true, country: true } }),
  ]);
  const clientInfo = new Map<string, { clientType: (typeof salesClients)[number]["clientType"]; country: string | null }>();
  for (const s of salesClients) {
    if (!clientInfo.has(s.clientName)) clientInfo.set(s.clientName, { clientType: s.clientType, country: s.country });
  }
  const nomesVenda = [...clientInfo.keys()];
  const porNormalizado = new Map<string, string>();
  for (const nome of nomesVenda) {
    const k = normalizarCliente(nome);
    if (!porNormalizado.has(k)) porNormalizado.set(k, nome);
  }
  const resolvidos = new Map<string, string | null>();
  return returns.map((r) => {
    const quantityKg = n(r.quantityKg);
    if (!resolvidos.has(r.clientName)) resolvidos.set(r.clientName, resolverClienteVenda(r.clientName, nomesVenda, porNormalizado));
    const clientNameVenda = resolvidos.get(r.clientName) ?? null;
    const info = clientNameVenda ? clientInfo.get(clientNameVenda) : undefined;
    return {
      id: r.id,
      clientName: r.clientName,
      clientNameVenda,
      clientType: info?.clientType ?? null,
      country: info?.country ?? null,
      quantityKg,
      quantitySacas: Number((quantityKg / KG_POR_SACA).toFixed(2)),
      returnDate: r.returnDate.toISOString().slice(0, 10),
      valueBRL: n(r.valueBRL),
    };
  });
}

export type SaleReturnRow = Awaited<ReturnType<typeof getSaleReturns>>[number];
