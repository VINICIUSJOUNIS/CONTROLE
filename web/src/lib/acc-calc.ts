// Calculo de juros de uma baixa (quitacao parcial) de ACC. Roda tanto no
// server (data.ts, ao montar getAccOperations) quanto no client
// (acc-view.tsx, para a previa ao vivo do formulario de nova baixa) - por
// isso parseLocalDate/daysBetween sao duplicados aqui em vez de importados
// de lib/date.ts ou lib/data.ts (que tem imports server-only), mesmo padrao
// ja usado em lib/amortization.ts.

// Parseia "YYYY-MM-DD" como data local ao meio-dia, evitando o shift de
// fuso horario de `new Date("YYYY-MM-DD")` (interpretado como UTC).
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export type BaixaJuros = { dias: number; jurosUSD: number };

// Juros de uma tranche liquidada: valorUSD x taxa ao ano x dias corridos / 360
// (convencao comercial em USD, da data da contratacao ate a data daquela
// tranche) - conferido contra o calculo real do banco (deposito de desagio).
export function calcBaixaJuros(
  valorUSD: number,
  taxaAnualPercent: number,
  contractDateISO: string,
  dataQuitacaoISO: string
): BaixaJuros {
  const dias = daysBetween(parseLocalDate(contractDateISO), parseLocalDate(dataQuitacaoISO));
  const jurosUSD = Number((valorUSD * (taxaAnualPercent / 100) * (dias / 360)).toFixed(2));
  return { dias, jurosUSD };
}

export type AccMonthlyInterest = {
  month: string; // "AAAA-MM"
  dias: number;
  saldoBaseUSD: number;
  jurosUSD: number;
  jurosValor: number;
};

// Quebra o juros do ACC mes a mes (calendario), para o relatorio individual.
// O saldo base de cada mes e o valor contratado menos as baixas com data
// anterior ao inicio daquele mes - se uma baixa cair no meio do mes, o juros
// daquele mes fica levemente superestimado (usa o saldo do inicio do mes
// inteiro), por simplicidade; o total oficial pago continua sendo
// jurosPagoValor (soma exata por tranche, ver calcBaixaJuros acima).
export function buildAccMonthlySchedule(params: {
  contractDate: string;
  fimAcumulado: string;
  interestRate: number;
  contractedValueForeign: number;
  closingRate: number;
  baixas: { valorUSD: number; dataQuitacao: string }[];
}): AccMonthlyInterest[] {
  const { contractDate, fimAcumulado, interestRate, contractedValueForeign, closingRate, baixas } = params;
  const start = parseLocalDate(contractDate);
  const end = parseLocalDate(fimAcumulado);
  if (end <= start) return [];

  const sortedBaixas = [...baixas].sort((a, b) => a.dataQuitacao.localeCompare(b.dataQuitacao));

  const rows: AccMonthlyInterest[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0);
  while (cursor < end) {
    const monthStart = cursor;
    const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1, 12, 0, 0);
    const segEnd = nextMonth < end ? nextMonth : end;
    const dias = daysBetween(monthStart, segEnd);
    if (dias > 0) {
      const monthStartStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(
        monthStart.getDate()
      ).padStart(2, "0")}`;
      const liquidadoAteInicio = sortedBaixas
        .filter((b) => b.dataQuitacao < monthStartStr)
        .reduce((s, b) => s + b.valorUSD, 0);
      const saldoBaseUSD = Math.max(0, Number((contractedValueForeign - liquidadoAteInicio).toFixed(2)));
      const jurosUSD = Number((saldoBaseUSD * (interestRate / 100) * (dias / 360)).toFixed(2));
      rows.push({
        month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
        dias,
        saldoBaseUSD,
        jurosUSD,
        jurosValor: Number((jurosUSD * closingRate).toFixed(2)),
      });
    }
    cursor = nextMonth;
  }
  return rows;
}
