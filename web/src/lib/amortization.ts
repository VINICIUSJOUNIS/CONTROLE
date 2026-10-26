export type AmortizationSystemValue = "PRICE" | "SAC" | "BULLET";

export type RateBasisValue = "MENSAL" | "SEMESTRAL" | "ANUAL";

// Dias do periodo de referencia da taxa informada (mes/semestre/ano comercial).
// Ex: taxa "1,99% ao mes" -> juros do periodo = saldo x 1,99% x (dias corridos / 30).
export const RATE_BASIS_DAYS: Record<RateBasisValue, number> = {
  MENSAL: 30,
  SEMESTRAL: 180,
  ANUAL: 365,
};

export type AmortizationInstallment = {
  numero: number;
  vencimento: string;
  amortizacao: number;
  juros: number;
  valorParcela: number;
  saldoDevedor: number;
  pagoAcumulado: number;
};

export type LoanForAmortization = {
  contractedValue: number;
  interestRate: number;
  rateBasis: RateBasisValue | string;
  installments: number;
  contractDate: string;
  firstDueDate: string;
  lastDueDate: string;
  amortizationSystem: AmortizationSystemValue | string;
};

// Parseia "YYYY-MM-DD" como data local ao meio-dia, evitando o shift de fuso
// horario de `new Date("YYYY-MM-DD")` (interpretado como UTC). Mesma abordagem
// de lib/date.ts, duplicada aqui porque este arquivo tambem roda no cliente.
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

// Soma meses a uma data mantendo o dia do mes (com "clamp" para meses mais curtos,
// ex: 31/01 + 1 mes = 28 ou 29/02).
function addMonthsClamped(date: Date, months: number) {
  const day = date.getDate();
  const base = new Date(date.getFullYear(), date.getMonth() + months, 1, 12, 0, 0);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(day, daysInMonth));
  return base;
}

// Repete o dia do mes do 1o vencimento a cada parcela (ex: 1o vencimento dia 30 ->
// todas as parcelas caem no dia 30, exceto a ultima, que e sempre a data de
// vencimento final do contrato).
function installmentDates(firstDueDate: string, lastDueDate: string, installments: number) {
  const first = parseLocalDate(firstDueDate);
  const last = parseLocalDate(lastDueDate);
  if (installments <= 1) return [last];

  const dates: Date[] = [first];
  for (let i = 1; i < installments - 1; i++) {
    dates.push(addMonthsClamped(first, i));
  }
  dates.push(last);
  return dates;
}

// Saldo devedor real de um emprestimo em uma data de referencia, usando o
// cronograma de amortizacao (respeita PRICE/SAC/BULLET, nao um percentual fixo).
// Liquidado (status + settlementDate), o saldo zera a partir da liquidacao.
export function saldoDevedorEm(
  loan: LoanForAmortization & { status?: string; settlementDate?: string | null },
  dataRef: string
): number {
  if (loan.status === "LIQUIDADO" && (!loan.settlementDate || dataRef >= loan.settlementDate)) {
    return 0;
  }
  // Antes da contratacao nao ha divida (antes devolvia o valor contratado cheio).
  if (dataRef < loan.contractDate) return 0;

  const schedule = buildAmortizationSchedule(loan);
  let saldo = loan.contractedValue;
  for (const row of schedule) {
    if (row.vencimento <= dataRef) saldo = row.saldoDevedor;
    else break;
  }
  return saldo;
}

export function buildAmortizationSchedule(
  loan: LoanForAmortization,
  vencimentoOverrides?: Record<number, string>
): AmortizationInstallment[] {
  const { contractedValue, installments } = loan;
  const rate = loan.interestRate / 100;
  const basisDays = RATE_BASIS_DAYS[loan.rateBasis as RateBasisValue] ?? RATE_BASIS_DAYS.ANUAL;
  const dates = installmentDates(loan.firstDueDate, loan.lastDueDate, installments).map((date, idx) => {
    const override = vencimentoOverrides?.[idx + 1];
    return override ? parseLocalDate(override) : date;
  });

  let saldo = contractedValue;
  let pagoAcumulado = 0;
  let prevDate = parseLocalDate(loan.contractDate);

  const amortizacaoFixaSAC = Number((contractedValue / installments).toFixed(2));

  const prazoTotalDias = daysBetween(parseLocalDate(loan.contractDate), parseLocalDate(loan.lastDueDate));
  const taxaPeriodicaPrice = rate * (prazoTotalDias / installments / basisDays);
  const parcelaFixaPrice =
    taxaPeriodicaPrice > 0
      ? (contractedValue * taxaPeriodicaPrice) / (1 - Math.pow(1 + taxaPeriodicaPrice, -installments))
      : contractedValue / installments;

  return dates.map((date, idx) => {
    const isLast = idx === installments - 1;
    const dias = daysBetween(prevDate, date);
    const juros = Number((saldo * rate * (dias / basisDays)).toFixed(2));

    let amortizacao: number;
    if (loan.amortizationSystem === "SAC") {
      amortizacao = isLast ? Number(saldo.toFixed(2)) : amortizacaoFixaSAC;
    } else if (loan.amortizationSystem === "BULLET") {
      amortizacao = isLast ? Number(saldo.toFixed(2)) : 0;
    } else {
      amortizacao = isLast ? Number(saldo.toFixed(2)) : Number((parcelaFixaPrice - juros).toFixed(2));
    }

    const valorParcela = Number((amortizacao + juros).toFixed(2));
    saldo = Math.max(0, Number((saldo - amortizacao).toFixed(2)));
    pagoAcumulado = Number((pagoAcumulado + valorParcela).toFixed(2));
    prevDate = date;

    return {
      numero: idx + 1,
      vencimento: toISODate(date),
      amortizacao,
      juros,
      valorParcela,
      saldoDevedor: saldo,
      pagoAcumulado,
    };
  });
}

// Proxima parcela ainda nao paga de um emprestimo (data e valor reais dela, nao a
// data final do contrato nem o valor total contratado). Pode ser uma parcela em
// atraso (vencimento no passado) - nesse caso e a mais urgente, nao a mais futura.
export function proximaParcela(
  loan: LoanForAmortization & {
    parcelas: { numero: number; vencimento: string | null; paidAt: string | null }[];
  }
) {
  const overrides: Record<number, string> = {};
  const pagas = new Set<number>();
  loan.parcelas.forEach((p) => {
    if (p.vencimento) overrides[p.numero] = p.vencimento;
    if (p.paidAt) pagas.add(p.numero);
  });
  const schedule = buildAmortizationSchedule(loan, overrides);
  return schedule.find((row) => !pagas.has(row.numero)) ?? null;
}

export type LoanParcelaReal = { numero: number; vencimento: string | null; paidAt: string | null; paidValue: number | null };

export type LoanJurosReais = {
  // Juros do contrato inteiro: valor real das parcelas pagas (valor pago -
  // amortizacao) + calculado das que faltam. Liquidado, para na liquidacao.
  jurosTotal: number;
  // Juros ja pagos: parcelas com pagamento registrado; liquidado, todas.
  jurosPago: number;
  // Juros corridos ate hoje (parcelas vencidas/pagas + pro rata do periodo atual).
  jurosAcumulado: number;
};

// Juros reais de um emprestimo, seguindo o cronograma de amortizacao (o saldo
// cai a cada parcela - SAC/PRICE - em vez de cobrar juros sobre o valor
// contratado cheio o prazo todo) e substituindo o juros calculado pelo valor
// realmente pago quando a parcela tem pagamento registrado. Liquidado
// (status + data de liquidacao), o cronograma e cortado na liquidacao: as
// parcelas posteriores viram uma unica quitacao do saldo restante, com juros
// so ate a data de liquidacao (ou o valor pago registrado nela, se houver).
type LoanReal = LoanForAmortization & { status: string; settlementDate: string | null };
type LinhaReal = { numero: number; inicio: string; vencimento: string; saldoInicial: number; amortizacao: number; juros: number };

// Cronograma efetivo do emprestimo: o de amortizacao (com os vencimentos
// corrigidos), cortado na liquidacao quando liquidado - as parcelas posteriores
// viram uma unica quitacao do saldo, com juros ate a data de liquidacao.
function cronogramaReal(loan: LoanReal, parcelas: LoanParcelaReal[]) {
  const overrides: Record<number, string> = {};
  const pagas = new Map<number, LoanParcelaReal>();
  parcelas.forEach((p) => {
    if (p.vencimento) overrides[p.numero] = p.vencimento;
    if (p.paidAt || p.paidValue != null) pagas.set(p.numero, p);
  });
  const schedule = buildAmortizationSchedule(loan, overrides);
  const rate = loan.interestRate / 100;
  const basisDays = RATE_BASIS_DAYS[loan.rateBasis as RateBasisValue] ?? RATE_BASIS_DAYS.ANUAL;
  const liquidado = loan.status === "LIQUIDADO";
  const dataLiquidacao = liquidado ? loan.settlementDate ?? loan.lastDueDate : null;

  const linhas: LinhaReal[] = [];
  let saldo = loan.contractedValue;
  let inicio = loan.contractDate;
  for (const row of schedule) {
    if (dataLiquidacao && row.vencimento > dataLiquidacao) break;
    linhas.push({ numero: row.numero, inicio, vencimento: row.vencimento, saldoInicial: saldo, amortizacao: row.amortizacao, juros: row.juros });
    saldo = row.saldoDevedor;
    inicio = row.vencimento;
  }
  if (dataLiquidacao && saldo > 0.005) {
    const dias = daysBetween(parseLocalDate(inicio), parseLocalDate(dataLiquidacao));
    linhas.push({
      numero: linhas.length + 1,
      inicio,
      vencimento: dataLiquidacao,
      saldoInicial: saldo,
      amortizacao: saldo,
      juros: Number((saldo * rate * (dias / basisDays)).toFixed(2)),
    });
  }

  return { linhas, pagas, liquidado, rate, basisDays };
}

// Pagamentos do emprestimo (principal + juros) na data em que saem do caixa:
// valor e data reais quando a parcela tem pagamento registrado; senao o valor
// e o vencimento do cronograma. Usado no fluxo de pagamentos do dashboard.
export function pagamentosLoanReais(loan: LoanReal, parcelas: LoanParcelaReal[]): { data: string; valor: number }[] {
  const { linhas, pagas } = cronogramaReal(loan, parcelas);
  return linhas.map((l) => {
    const p = pagas.get(l.numero);
    return {
      data: p?.paidAt ?? l.vencimento,
      valor: p?.paidValue != null ? p.paidValue : Number((l.amortizacao + l.juros).toFixed(2)),
    };
  });
}

export function calcLoanJurosReais(
  loan: LoanReal,
  parcelas: LoanParcelaReal[],
  hoje: string
): LoanJurosReais {
  const { linhas, pagas, liquidado, rate, basisDays } = cronogramaReal(loan, parcelas);
  let jurosTotal = 0;
  let jurosPago = 0;
  let jurosAcumulado = 0;
  for (const l of linhas) {
    const pago = pagas.get(l.numero);
    const juros = pago?.paidValue != null ? Math.max(0, Number((pago.paidValue - l.amortizacao).toFixed(2))) : l.juros;
    jurosTotal += juros;
    if (liquidado || pago) jurosPago += juros;
    if (liquidado || pago || l.vencimento <= hoje) {
      jurosAcumulado += juros;
    } else if (l.inicio < hoje) {
      const dias = daysBetween(parseLocalDate(l.inicio), parseLocalDate(hoje));
      jurosAcumulado += l.saldoInicial * rate * (dias / basisDays);
    }
  }
  return {
    jurosTotal: Number(jurosTotal.toFixed(2)),
    jurosPago: Number(jurosPago.toFixed(2)),
    jurosAcumulado: Number(jurosAcumulado.toFixed(2)),
  };
}
