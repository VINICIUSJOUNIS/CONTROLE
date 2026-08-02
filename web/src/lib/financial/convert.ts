import type { StatementInput } from "./indicators";
import { financialStatementFieldKeys, type FinancialStatementFields } from "./schema";

const nullableFields = new Set(["ativosMoedaEstrangeira", "passivosMoedaEstrangeira"]);

// Converte um FinancialStatement do Prisma para o StatementInput (campos
// number) usado pelo motor de indicadores. Itera sobre financialStatementFieldKeys
// para nao precisar listar cada campo na mao (schema.ts e a fonte da verdade).
export function statementRecordToInput(record: Record<string, unknown>): StatementInput {
  const result: Record<string, unknown> = {};
  for (const key of financialStatementFieldKeys) {
    if (key === "periodLabel") {
      result[key] = record[key] as string;
    } else if (key === "referenceDate") {
      result[key] = record[key] as Date;
    } else if (key === "periodDays") {
      result[key] = Number(record[key]);
    } else if (nullableFields.has(key)) {
      const v = record[key];
      result[key] = v == null ? null : Number(v);
    } else {
      result[key] = Number(record[key]);
    }
  }
  return result as StatementInput;
}

// Converte um FinancialStatement do Prisma para FinancialStatementFields (o
// formato usado pelo StatementForm/actions), com referenceDate como string
// "AAAA-MM-DD" em vez de Date.
export function statementRecordToFields(record: Record<string, unknown>): FinancialStatementFields {
  const input = statementRecordToInput(record);
  const { referenceDate, ...rest } = input;
  return {
    ...rest,
    referenceDate: referenceDate.toISOString().slice(0, 10),
  } as FinancialStatementFields;
}
