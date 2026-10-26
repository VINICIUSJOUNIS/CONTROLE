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
// Dentro de cada mes, o periodo e cortado nas datas das baixas: cada trecho
// usa o saldo realmente em aberto (contratado - baixas ate aquele dia), entao
// a soma bate com o juros por tranche (calcBaixaJuros) - uma baixa no meio do
// mes so deixa de render a partir da propria data. Conversao em R$ pela taxa
// informada (taxa de quitacao se liquidado, taxa de fechamento se em aberto).
export function buildAccMonthlySchedule(params: {
  contractDate: string;
  fimAcumulado: string;
  interestRate: number;
  contractedValueForeign: number;
  taxaConversao: number;
  baixas: { valorUSD: number; dataQuitacao: string }[];
}): AccMonthlyInterest[] {
  const { contractDate, fimAcumulado, interestRate, contractedValueForeign, taxaConversao, baixas } = params;
  const start = parseLocalDate(contractDate);
  const end = parseLocalDate(fimAcumulado);
  if (end <= start) return [];

  const toStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const saldoEm = (dia: string) => {
    const liquidado = baixas.filter((b) => b.dataQuitacao <= dia).reduce((s, b) => s + b.valorUSD, 0);
    return Math.max(0, Number((contractedValueForeign - liquidado).toFixed(2)));
  };

  const rows: AccMonthlyInterest[] = [];
  let cursor = start;
  while (cursor < end) {
    const monthStart = cursor;
    const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1, 12, 0, 0);
    const segEnd = nextMonth < end ? nextMonth : end;
    const dias = daysBetween(monthStart, segEnd);
    if (dias > 0) {
      const cortes = Array.from(
        new Set(
          baixas
            .map((b) => b.dataQuitacao)
            .filter((d) => d > toStr(monthStart) && d < toStr(segEnd))
        )
      ).sort();
      const pontos = [toStr(monthStart), ...cortes, toStr(segEnd)];
      let jurosUSDExato = 0;
      for (let i = 0; i < pontos.length - 1; i++) {
        const d = daysBetween(parseLocalDate(pontos[i]), parseLocalDate(pontos[i + 1]));
        jurosUSDExato += saldoEm(pontos[i]) * (interestRate / 100) * (d / 360);
      }
      const jurosUSD = Number(jurosUSDExato.toFixed(2));
      rows.push({
        month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
        dias,
        saldoBaseUSD: saldoEm(toStr(monthStart)),
        jurosUSD,
        jurosValor: Number((jurosUSD * taxaConversao).toFixed(2)),
      });
    }
    cursor = nextMonth;
  }
  return rows;
}
