"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { BudgetGroup, BudgetScenario } from "@/generated/prisma/client";

function revalidateAll() {
  revalidatePath("/planejamento-orcamentario");
}

export type BudgetPlanAssumptionsInput = {
  name: string;
  scenario: BudgetScenario;
  cotacaoSacaUsd: number;
  cotacaoDolar: number;
  crescimentoModerado: number;
  crescimentoOtimista: number;
  crescimentoMuitoOtimista: number;
};

export async function updateBudgetPlanAssumptions(planId: string, input: BudgetPlanAssumptionsInput) {
  await prisma.budgetPlan.update({
    where: { id: planId },
    data: {
      name: input.name,
      scenario: input.scenario,
      cotacaoSacaUsd: input.cotacaoSacaUsd,
      cotacaoDolar: input.cotacaoDolar,
      crescimentoModerado: input.crescimentoModerado,
      crescimentoOtimista: input.crescimentoOtimista,
      crescimentoMuitoOtimista: input.crescimentoMuitoOtimista,
    },
  });
  revalidateAll();
}

export type BudgetVolumeMonthInput = {
  month: number;
  volumeBaseSacas: number;
  volumeExternoSacas: number;
  volumeInternoRealizado: number;
  volumeExternoRealizado: number;
  receitaRealizada: number;
};

export async function upsertBudgetVolumeMonths(planId: string, rows: BudgetVolumeMonthInput[]) {
  await prisma.$transaction(
    rows.map((row) =>
      prisma.budgetVolumeMonth.upsert({
        where: { budgetPlanId_month: { budgetPlanId: planId, month: row.month } },
        create: {
          budgetPlanId: planId,
          month: row.month,
          volumeBaseSacas: row.volumeBaseSacas,
          volumeExternoSacas: row.volumeExternoSacas,
          volumeInternoRealizado: row.volumeInternoRealizado,
          volumeExternoRealizado: row.volumeExternoRealizado,
          receitaRealizada: row.receitaRealizada,
        },
        update: {
          volumeBaseSacas: row.volumeBaseSacas,
          volumeExternoSacas: row.volumeExternoSacas,
          volumeInternoRealizado: row.volumeInternoRealizado,
          volumeExternoRealizado: row.volumeExternoRealizado,
          receitaRealizada: row.receitaRealizada,
        },
      })
    )
  );
  revalidateAll();
}

export type BudgetLineMonthInput = { month: number; valorPrevisto: number; valorRealizado: number };

export async function upsertBudgetLineMonths(lineId: string, rows: BudgetLineMonthInput[]) {
  await prisma.$transaction(
    rows.map((row) =>
      prisma.budgetLineMonth.upsert({
        where: { budgetLineId_month: { budgetLineId: lineId, month: row.month } },
        create: {
          budgetLineId: lineId,
          month: row.month,
          valorPrevisto: row.valorPrevisto,
          valorRealizado: row.valorRealizado,
        },
        update: { valorPrevisto: row.valorPrevisto, valorRealizado: row.valorRealizado },
      })
    )
  );
  revalidateAll();
}

export async function createBudgetLine(planId: string, group: BudgetGroup, name: string) {
  const count = await prisma.budgetLine.count({ where: { budgetPlanId: planId, group } });
  await prisma.budgetLine.create({
    data: { budgetPlanId: planId, group, name, orderIndex: count + 1 },
  });
  revalidateAll();
}

export async function renameBudgetLine(id: string, name: string) {
  await prisma.budgetLine.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteBudgetLine(id: string) {
  await prisma.budgetLine.delete({ where: { id } });
  revalidateAll();
}
