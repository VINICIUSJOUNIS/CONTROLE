// Parseia uma string "YYYY-MM-DD" (de um <input type="date">) como data local
// ao meio-dia, evitando o shift de fuso horario que ocorre com `new Date("YYYY-MM-DD")`
// (interpretado como UTC) quando o valor e depois serializado para uma coluna @db.Date.
// Meio-dia (em vez de meia-noite) garante que nenhum fuso horario razoavel empurre a
// data para o dia anterior ou seguinte durante o round-trip.
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}
