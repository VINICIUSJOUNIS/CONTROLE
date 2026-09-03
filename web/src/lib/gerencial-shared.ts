export const MESES_LABEL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function matchesPeriod(dateStr: string, year: string, month: string, day: string) {
  if (!year) return true;
  if (dateStr.slice(0, 4) !== year) return false;
  if (!month) return true;
  if (dateStr.slice(5, 7) !== month) return false;
  if (!day) return true;
  return dateStr.slice(8, 10) === day;
}

export function periodLabel(year: string, month: string, day: string) {
  if (!year) return "Todos os períodos";
  if (!month) return `Ano de ${year}`;
  const mesLabel = MESES_LABEL[Number(month) - 1];
  if (!day) return `${mesLabel} de ${year}`;
  return `${day}/${month}/${year}`;
}
