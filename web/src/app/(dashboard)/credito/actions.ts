"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateRiskInsights, ExtractionError } from "@/lib/anthropic";
import { statementRecordToInput } from "@/lib/financial/convert";
import {
  ebitda,
  margemEbitda,
  dividaLiquida,
  capitalDeGiro,
  cicloFinanceiro,
  pmrDias,
  pmeDias,
  pmpDias,
  exposicaoCambialLiquida,
} from "@/lib/financial/indicators";

export type RegenerateResult = { ok: true } | { ok: false; error: string };

export async function regenerateRiskInsightsAction(statementId: string): Promise<RegenerateResult> {
  const record = await prisma.financialStatement.findUnique({ where: { id: statementId } });
  if (!record) return { ok: false, error: "Balanço/DRE não encontrado." };

  const statement = statementRecordToInput(record);

  const summary = {
    periodo: statement.periodLabel,
    receitaLiquida: statement.receitaLiquida,
    ebitda: ebitda(statement),
    margemEbitdaPct: (margemEbitda(statement) ?? 0) * 100,
    lucroLiquido: statement.lucroLiquido,
    dividaLiquida: dividaLiquida(statement),
    capitalDeGiro: capitalDeGiro(statement),
    cicloFinanceiroDias: cicloFinanceiro(statement),
    pmrDias: pmrDias(statement),
    pmeDias: pmeDias(statement),
    pmpDias: pmpDias(statement),
    exposicaoCambialLiquida: exposicaoCambialLiquida(statement),
  };

  try {
    const insights = await generateRiskInsights(summary);
    await prisma.financialStatement.update({
      where: { id: statementId },
      data: { aiInsights: insights },
    });
    revalidatePath("/credito");
    return { ok: true };
  } catch (err) {
    const message = err instanceof ExtractionError ? err.message : "Falha ao gerar análise de riscos.";
    return { ok: false, error: message };
  }
}
