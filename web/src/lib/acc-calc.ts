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
