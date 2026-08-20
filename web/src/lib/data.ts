import { prisma } from "@/lib/prisma";
import { RATE_BASIS_DAYS, RateBasisValue, saldoDevedorEm } from "@/lib/amortization";
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

export async function getContasGarantidas() {
  const contas = await prisma.contaGarantida.findMany({
    include: { bank: true },
    orderBy: { createdAt: "desc" },
  });

  return contas.map((c) => {
    const limiteContratado = n(c.limiteContratado);
    const valorUtilizado = n(c.valorUtilizado);
    const taxaJurosPercent = n(c.taxaJurosPercent);
    const iofPercent = n(c.iofPercent);
    const iofAdicionalPercent = n(c.iofAdicionalPercent);

    const valorDisponivel = Number((limiteContratado - valorUtilizado).toFixed(2));
    const jurosPeriodo = Number((valorUtilizado * (taxaJurosPercent / 100)).toFixed(2));
    const iofPeriodo = Number((valorUtilizado * (iofPercent / 100)).toFixed(2));
    const iofAdicionalPeriodo = Number((valorUtilizado * (iofAdicionalPercent / 100)).toFixed(2));
    const valorAPagarPeriodo = Number((jurosPeriodo + iofPeriodo + iofAdicionalPeriodo).toFixed(2));

    return {
      id: c.id,
      bankId: c.bankId,
      bankName: c.bank.name,
      bankColor: c.bank.color,
      limiteContratado,
      valorUtilizado,
      valorDisponivel,
      taxaJurosPercent,
      iofPercent,
      iofAdicionalPercent,
      jurosPeriodo,
      iofPeriodo,
      iofAdicionalPeriodo,
      valorAPagarPeriodo,
      observacao: c.observacao,
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}

export type ContaGarantidaRow = Awaited<ReturnType<typeof getContasGarantidas>>[number];

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

    // Juros/custo projetados para a vida toda do contrato: se liquidado antecipadamente,
    // usa o periodo real (contratacao ate a liquidacao); senao, usa o prazo contratado
    // (usado no KPI "Juros futuros" do dashboard, uma projecao do contrato ativo).
    const fimPeriodo = l.settlementDate ?? l.lastDueDate;
    const prazoMeses = monthsBetween(l.contractDate, fimPeriodo);
    const prazoDias = daysBetween(l.contractDate, fimPeriodo);
    const basisDays = RATE_BASIS_DAYS[l.rateBasis as RateBasisValue] ?? RATE_BASIS_DAYS.ANUAL;
    const jurosValor = Number(
      (contractedValue * (interestRate / 100) * (prazoDias / basisDays)).toFixed(2)
    );
    const custoTotal = Number((jurosValor + iof + insuranceCost + otherCosts).toFixed(2));

    // Juros/custo realmente acumulados ate hoje (ou ate a liquidacao, se ja liquidado).
    // E o que aparece na tabela de Emprestimos - nao inclui juros que ainda nao correram.
    const fimAcumulado = l.settlementDate ?? hoje;
    const prazoDiasAcumulado = daysBetween(l.contractDate, fimAcumulado);
    const jurosAcumulado = Number(
      (contractedValue * (interestRate / 100) * (prazoDiasAcumulado / basisDays)).toFixed(2)
    );
    const custoAcumulado = Number((jurosAcumulado + iof + insuranceCost + otherCosts).toFixed(2));

    const contractDateStr = l.contractDate.toISOString().slice(0, 10);
    const firstDueDateStr = l.firstDueDate.toISOString().slice(0, 10);
    const lastDueDateStr = l.lastDueDate.toISOString().slice(0, 10);
    const settlementDateStr = l.settlementDate ? l.settlementDate.toISOString().slice(0, 10) : null;
    const hojeStr = hoje.toISOString().slice(0, 10);

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
      custoTotal,
      jurosAcumulado,
      custoAcumulado,
      saldoDevedorAtual,
      status: l.status,
      parcelas: l.installmentRecords.map((r) => ({
        numero: r.numero,
        vencimento: r.vencimento ? r.vencimento.toISOString().slice(0, 10) : null,
        paidAt: r.paidAt ? r.paidAt.toISOString().slice(0, 10) : null,
        paidValue: r.paidValue != null ? n(r.paidValue) : null,
      })),
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
    const exchangeSpread = n(a.exchangeSpread);
    const iof = n(a.iof);
    const bankFees = n(a.bankFees);
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

    // Juros pagos: se ha baixas registradas, e a soma dos juros de cada tranche
    // (mais preciso - cada parte tem seu proprio prazo real). Sem baixas
    // (comportamento de sempre, quitacao unica), usa o prazo entre a
    // contratacao e a quitacao efetiva (ou o vencimento, enquanto nao quitado,
    // como estimativa), convertido pela taxa de variacao cambial informada na
    // quitacao (ou a taxa de fechamento, enquanto essa taxa nao for informada).
    let jurosPagoUSD: number;
    let jurosPagoValor: number;
    let taxaConversaoJurosPagos: number;
    if (baixas.length > 0) {
      jurosPagoUSD = Number(baixas.reduce((s, b) => s + b.jurosUSD, 0).toFixed(2));
      jurosPagoValor = Number(baixas.reduce((s, b) => s + b.jurosValor, 0).toFixed(2));
      taxaConversaoJurosPagos = baixas[baixas.length - 1].closingRate;
    } else {
      const prazoRealDias = daysBetween(a.contractDate, a.closingDate ?? a.settlementDate);
      jurosPagoUSD = Number(
        (contractedValueForeign * (interestRate / 100) * (prazoRealDias / DIAS_ANO_BASE)).toFixed(2)
      );
      taxaConversaoJurosPagos = exchangeVariationValue > 0 ? exchangeVariationValue : closingRate;
      jurosPagoValor = Number((jurosPagoUSD * taxaConversaoJurosPagos).toFixed(2));
    }

    // Valor do spread: (valor contratado x taxa spot) - valor recebido.
    const spreadValor = Number((contractedValueForeign * spotRate - receivedValueBRL).toFixed(2));

    // Custo total: spread + juros pagos + IOF + tarifas + seguro + outras despesas.
    const custoTotal = Number(
      (spreadValor + jurosPagoValor + iof + bankFees + insuranceCost + otherCosts).toFixed(2)
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
      hasInsurance: a.hasInsurance,
      insuranceCost,
      otherCosts,
      prazoMeses,
      jurosValorUSD,
      jurosValor,
      jurosPagoUSD,
      jurosPagoValor,
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
  const saldoDevedorAcc = accOperations
    .filter((a) => a.status !== "LIQUIDADO")
    .reduce((sum, a) => sum + a.receivedValueBRL, 0);
  const saldoDevedorAccUsd = accOperations
    .filter((a) => a.status !== "LIQUIDADO")
    .reduce((sum, a) => sum + a.contractedValueForeign, 0);
  const saldoDevedorTotal = saldoDevedorLoans + saldoDevedorAcc;

  const totalContratado = loans.reduce((sum, l) => sum + l.contractedValue, 0);
  // Total contratado da carteira inteira (emprestimos + ACC), usado no KPI geral do
  // dashboard - "totalContratado" sozinho e so emprestimos (usado no grafico de
  // distribuicao por modalidade, onde precisa ficar separado do ACC).
  const totalAccContratado = accOperations.reduce((sum, a) => sum + a.receivedValueBRL, 0);
  const totalContratadoGeral = totalContratado + totalAccContratado;

  const jurosPagos =
    loans.filter((l) => l.status === "LIQUIDADO").reduce((sum, l) => sum + l.jurosValor, 0) +
    accOperations
      .filter((a) => a.status === "LIQUIDADO")
      .reduce((sum, a) => sum + a.jurosPagoValor, 0);
  // Juros futuros: o que ainda falta pagar (projecao total menos o que ja correu ate
  // hoje), nao a projecao inteira do contrato - senao dobraria os juros ja acumulados.
  // Do lado do ACC, jurosValor projeta sobre o valor contratado cheio e o prazo
  // contratado inteiro (nao "ate hoje"), entao nao da pra subtrair jurosPagoValor
  // aqui do mesmo jeito que do lado do emprestimo sem reduzir demais o numero pra
  // contratos com baixa parcial - mantido como projecao cheia do contrato.
  const jurosFuturos =
    loans
      .filter((l) => l.status !== "LIQUIDADO")
      .reduce((sum, l) => sum + Math.max(0, l.jurosValor - l.jurosAcumulado), 0) +
    accOperations
      .filter((a) => a.status !== "LIQUIDADO")
      .reduce((sum, a) => sum + a.jurosValor, 0);

  // Exposicao cambial em US$ (moeda do risco), nao convertida para R$. Usa o
  // saldo real em aberto (contratado - ja liquidado em baixas), nao o valor
  // contratado cheio - senao superestima a exposicao apos quitacoes parciais.
  const exposicaoCambial = accOperations
    .filter((a) => a.status === "EM_ABERTO")
    .reduce((sum, a) => sum + a.saldoAbertoUSD, 0);

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
    const saldoAcc = accOperations
      .filter((a) => {
        // Usa a data real de quitacao quando ja liquidado (pode ser antes ou depois do
        // vencimento contratual); enquanto em aberto, usa o vencimento como estimativa.
        const effectiveEnd = (a.dataQuitacao ?? a.settlementDate).slice(0, 7);
        return a.contractDate.slice(0, 7) <= month && effectiveEnd >= month;
      })
      .reduce((sum, a) => sum + a.receivedValueBRL, 0);

    return { month, saldoDevedor: Math.round(saldoLoans + saldoAcc) };
  });
}

export async function getCashFlow(range?: PeriodRange, modalidade?: ModalidadeFilter) {
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
    const entradasEmprestimos = loans
      .filter((l) => monthKey(l.contractDate) === month)
      .reduce((sum, l) => sum + l.contractedValue, 0);

    const saidasEmprestimos = loans
      .filter((l) => {
        return (
          l.status !== "LIQUIDADO" &&
          l.firstDueDate.slice(0, 7) <= month &&
          l.lastDueDate.slice(0, 7) >= month
        );
      })
      .reduce((sum, l) => sum + l.contractedValue / l.installments, 0);

    // ACC: entrada do adiantamento na contratacao, saida (liquidacao do principal) no vencimento.
    const entradasAcc = accOperations
      .filter((a) => monthKey(a.contractDate) === month)
      .reduce((sum, a) => sum + a.receivedValueBRL, 0);

    const saidasAcc = accOperations
      .filter((a) => monthKey(a.settlementDate) === month)
      .reduce((sum, a) => sum + a.receivedValueBRL, 0);

    return {
      month,
      entradas: Math.round(entradasEmprestimos + entradasAcc),
      saidas: Math.round(saidasEmprestimos + saidasAcc),
    };
  });
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

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    // Taxa media ponderada pelo valor de cada contrato (nao uma media simples), com
    // a taxa dos emprestimos anualizada para poder misturar bases diferentes.
    const loanAvgRate = weightedAvg(
      loansInMonth.map((l) => ({
        rate: annualizedRate(l.interestRate, l.rateBasis),
        weight: l.contractedValue,
      }))
    );
    const accAvgRate = weightedAvg(
      accInMonth.map((a) => ({ rate: a.interestRate, weight: a.receivedValueBRL }))
    );
    const spotAvg = avg(accInMonth.map((a) => a.spotRate));
    const closingAvg = avg(accInMonth.map((a) => a.closingRate));
    const ptax = avg(accInMonth.map((a) => a.ptaxContracting));
    const cambialSpread = avg(accInMonth.map((a) => a.exchangeSpread));

    // Custo financeiro efetivo: custo total / principal, ponderado, para emprestimos e ACC
    // contratados no mes (reflete o custo real, nao um peso arbitrario entre as taxas).
    const custoTotalMes =
      loansInMonth.reduce((s, l) => s + l.custoTotal, 0) +
      accInMonth.reduce((s, a) => s + a.custoTotal, 0);
    const principalMes =
      loansInMonth.reduce((s, l) => s + l.contractedValue, 0) +
      accInMonth.reduce((s, a) => s + a.receivedValueBRL, 0);
    const financialCost = principalMes > 0 ? (custoTotalMes / principalMes) * 100 : 0;

    return {
      month,
      loanAvgRate: Number(loanAvgRate.toFixed(2)),
      accAvgRate: Number(accAvgRate.toFixed(2)),
      ptax: Number(ptax.toFixed(4)),
      spotAvg: Number(spotAvg.toFixed(4)),
      closingAvg: Number(closingAvg.toFixed(4)),
      cambialSpread: Number(cambialSpread.toFixed(4)),
      financialCost: Number(financialCost.toFixed(2)),
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

  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

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

    return {
      year,
      loanAvgRate: Number(
        weightedAvg(
          loansInYear.map((l) => ({
            rate: annualizedRate(l.interestRate, l.rateBasis),
            weight: l.contractedValue,
          }))
        ).toFixed(2)
      ),
      accAvgRate: Number(
        weightedAvg(accInYear.map((a) => ({ rate: a.interestRate, weight: a.receivedValueBRL }))).toFixed(2)
      ),
      totalCaptado: Math.round(totalCaptado),
      custoMedio: Number(custoMedio.toFixed(2)),
      qtdOperacoes: loansInYear.length + accInYear.length,
      spotMedio: Number(avg(accInYear.map((a) => a.spotRate)).toFixed(4)),
      fechamentoMedio: Number(avg(accInYear.map((a) => a.closingRate)).toFixed(4)),
      spreadMedio: Number(avg(accInYear.map((a) => a.exchangeSpread)).toFixed(4)),
      ptaxMedia: Number(avg(accInYear.map((a) => a.ptaxContracting)).toFixed(4)),
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
        if (inQuarter.length === 0) return 0;
        return Number(
          (inQuarter.reduce((s, l) => s + l.interestRate, 0) / inQuarter.length).toFixed(2)
        );
      });
      return { bank: bank.name, values };
    })
    .filter((r): r is { bank: string; values: number[] } => r !== null);

  return { rows, quarters };
}

export async function getBankComparison(range?: PeriodRange) {
  const [banks, allAccOperations] = await Promise.all([getBanks(), getAccOperations()]);
  const accOperations = filterByPeriod(allAccOperations, range);

  return banks.map((bank) => {
    const ops = accOperations.filter((a) => a.bankId === bank.id);
    const qtd = ops.length || 1;
    const valorCaptado = ops.reduce((s, a) => s + a.receivedValueBRL, 0);
    const custoTotalGeral = Number(ops.reduce((s, a) => s + a.custoTotal, 0).toFixed(2));
    return {
      bankId: bank.id,
      bankName: bank.name,
      bankColor: bank.color,
      qtdAcc: ops.length,
      valorCaptado,
      taxaMedia: Number((ops.reduce((s, a) => s + a.interestRate, 0) / qtd).toFixed(2)),
      spreadMedio: Number((ops.reduce((s, a) => s + a.exchangeSpread, 0) / qtd).toFixed(4)),
      spotMedio: Number((ops.reduce((s, a) => s + a.spotRate, 0) / qtd).toFixed(4)),
      fechamentoMedio: Number((ops.reduce((s, a) => s + a.closingRate, 0) / qtd).toFixed(4)),
      // Custo medio real: custo total / valor captado (custo efetivo ponderado pelo banco).
      custoMedio: valorCaptado > 0 ? Number(((custoTotalGeral / valorCaptado) * 100).toFixed(2)) : 0,
      // Totais absolutos (soma, nao media) para comparar o custo real pago a cada banco.
      // Custo total geral = spread + juros pagos + seguro + outros (mesma definicao usada
      // na tela de ACC). IOF e tarifas sao custos reais mas ficam fora dessa metrica, por
      // isso aparecem como colunas separadas em vez de somados no total.
      totalSpread: Number(ops.reduce((s, a) => s + a.spreadValor, 0).toFixed(2)),
      totalJuros: Number(ops.reduce((s, a) => s + a.jurosPagoValor, 0).toFixed(2)),
      totalIOF: Number(ops.reduce((s, a) => s + a.iof, 0).toFixed(2)),
      totalTarifas: Number(ops.reduce((s, a) => s + a.bankFees, 0).toFixed(2)),
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

export async function getSaleReturns() {
  // Devolucao nao guarda tipo de cliente/pais (a tabela so tem clientName), mas
  // como o nome de um cliente nao muda de interno pra externo, resolvemos isso
  // aqui cruzando com o cadastro de Sale — assim toda tela que consome devolucao
  // ja recebe o segmento certo, sem precisar aproximar por proporcao.
  const [returns, salesClients] = await Promise.all([
    prisma.saleReturn.findMany({ orderBy: { returnDate: "desc" } }),
    prisma.sale.findMany({ select: { clientName: true, clientType: true, country: true } }),
  ]);
  const clientInfo = new Map<string, { clientType: (typeof salesClients)[number]["clientType"]; country: string | null }>();
  for (const s of salesClients) {
    if (!clientInfo.has(s.clientName)) clientInfo.set(s.clientName, { clientType: s.clientType, country: s.country });
  }
  return returns.map((r) => {
    const quantityKg = n(r.quantityKg);
    const info = clientInfo.get(r.clientName);
    return {
      id: r.id,
      clientName: r.clientName,
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
