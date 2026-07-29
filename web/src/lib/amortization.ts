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

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

// Distribui as parcelas uniformemente entre a 1a e a ultima data de vencimento.
function installmentDates(firstDueDate: string, lastDueDate: string, installments: number) {
  const first = new Date(firstDueDate);
  const last = new Date(lastDueDate);
  if (installments <= 1) return [last];

  const totalMs = last.getTime() - first.getTime();
  const dates: Date[] = [];
  for (let i = 0; i < installments; i++) {
    dates.push(new Date(first.getTime() + (totalMs * i) / (installments - 1)));
  }
  return dates;
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
    return override ? new Date(override) : date;
  });

  let saldo = contractedValue;
  let pagoAcumulado = 0;
  let prevDate = new Date(loan.contractDate);

  const amortizacaoFixaSAC = Number((contractedValue / installments).toFixed(2));

  const prazoTotalDias = daysBetween(new Date(loan.contractDate), new Date(loan.lastDueDate));
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
      vencimento: date.toISOString().slice(0, 10),
      amortizacao,
      juros,
      valorParcela,
      saldoDevedor: saldo,
      pagoAcumulado,
    };
  });
}
