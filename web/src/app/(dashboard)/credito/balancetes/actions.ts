"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { financialStatementFieldsSchema, type FinancialStatementFields } from "@/lib/financial/schema";

function revalidateCredito() {
  revalidatePath("/credito");
  revalidatePath("/credito/balanco");
  revalidatePath("/credito/dre");
  revalidatePath("/credito/fluxo-de-caixa");
  revalidatePath("/credito/indicadores");
  revalidatePath("/credito/balancetes");
}

export type SaveResult = { ok: true } | { ok: false; error: string };

function toPrismaData(fields: FinancialStatementFields) {
  const { referenceDate, ativosMoedaEstrangeira, passivosMoedaEstrangeira, ...rest } = fields;
  return {
    ...rest,
    referenceDate: new Date(referenceDate),
    ativosMoedaEstrangeira: ativosMoedaEstrangeira ?? null,
    passivosMoedaEstrangeira: passivosMoedaEstrangeira ?? null,
  };
}

export async function updateStatementAction(id: string, rawFields: unknown): Promise<SaveResult> {
  const parsed = financialStatementFieldsSchema.safeParse(rawFields);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Dados inválidos: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    };
  }

  try {
    await prisma.financialStatement.update({
      where: { id },
      data: { ...toPrismaData(parsed.data), extractedRaw: parsed.data },
    });
    revalidateCredito();
    return { ok: true };
  } catch {
    return { ok: false, error: "Falha ao salvar as alterações." };
  }
}

export async function deleteStatementAction(id: string): Promise<SaveResult> {
  try {
    await prisma.financialStatement.delete({ where: { id } });
    revalidateCredito();
    return { ok: true };
  } catch {
    return { ok: false, error: "Falha ao excluir o balancete." };
  }
}
