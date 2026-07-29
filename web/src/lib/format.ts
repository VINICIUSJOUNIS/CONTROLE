export function formatCurrency(value: number, currency: string = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "BRL" ? 0 : 2,
  }).format(value);
}

// Sempre com 2 casas decimais, sem arredondar para inteiro (formato 999.999,99).
export function formatCurrencyPrecise(value: number, currency: string = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactCurrency(value: number, currency: string = "BRL") {
  return formatCurrency(value, currency);
}

export function formatPercent(value: number, digits: number = 2) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatDate(value: string | Date) {
  let date: Date;
  if (typeof value === "string") {
    // Parseia "YYYY-MM-DD" como data local, evitando o shift de fuso horario
    // que ocorre ao usar `new Date("YYYY-MM-DD")` (interpretado como UTC).
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = value;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(date);
}
