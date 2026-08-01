"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { extractFinancialStatement, ExtractionError } from "@/lib/anthropic";
import { financialStatementFieldsSchema, type FinancialStatementFields } from "@/lib/financial/schema";

export type ExtractResult =
  | { ok: true; fields: FinancialStatementFields; sourceFileName: string }
  | { ok: false; error: string };

export async function extractFromPdfAction(formData: FormData): Promise<ExtractResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo PDF." };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, error: "O arquivo precisa ser um PDF." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  try {
    const fields = await extractFinancialStatement(base64);
    return { ok: true, fields, sourceFileName: file.name };
  } catch (err) {
    const message = err instanceof ExtractionError ? err.message : "Falha ao processar o PDF com a IA.";
    return { ok: false, error: message };
  }
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

function toPrismaData(fields: FinancialStatementFields) {
  const { referenceDate, ativosMoedaEstrangeira, passivosMoedaEstrangeira, ...rest } = fields;
  return {
    ...rest,
    referenceDate: new Date(referenceDate),
    ativosMoedaEstrangeira: ativosMoedaEstrangeira ?? null,
    passivosMoedaEstrangeira: passivosMoedaEstrangeira ?? null,
  };
}

export async function saveFinancialStatementAction(
  rawFields: unknown,
  sourceFileName: string
): Promise<SaveResult> {
  const parsed = financialStatementFieldsSchema.safeParse(rawFields);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Dados invalidos: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    };
  }
  const fields = parsed.data;

  try {
    const data = toPrismaData(fields);
    const saved = await prisma.financialStatement.upsert({
      where: { referenceDate: data.referenceDate },
      create: { ...data, sourceFileName, extractedRaw: fields },
      update: { ...data, sourceFileName, extractedRaw: fields },
    });
    revalidatePath("/");
    revalidatePath("/indicadores");
    revalidatePath("/balancetes");
    return { ok: true, id: saved.id };
  } catch {
    return { ok: false, error: "Falha ao salvar no banco de dados." };
  }
}
