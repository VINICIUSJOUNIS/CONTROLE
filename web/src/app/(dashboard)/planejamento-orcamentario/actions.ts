"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { BudgetGroup, BudgetScenario } from "@/generated/prisma/client";
import { calcularVolumesBaseProjecao } from "@/lib/budget-data";

function revalidateAll() {
  // layout: revalida todas as paginas do modulo (orcamento, historico e
  // projecoes, premissas, tributos).
  revalidatePath("/planejamento-orcamentario", "layout");
}

export type BudgetPlanAssumptionsInput = {
  name: string;
  scenario: BudgetScenario;
  cotacaoSacaUsd: number;
  cotacaoDolar: number;
  crescimentoModerado: number;
  crescimentoOtimista: number;
  crescimentoMuitoOtimista: number;
  crescimentoModeradoExterno: number;
  crescimentoOtimistaExterno: number;
  crescimentoMuitoOtimistaExterno: number;
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
      crescimentoModeradoExterno: input.crescimentoModeradoExterno,
      crescimentoOtimistaExterno: input.crescimentoOtimistaExterno,
      crescimentoMuitoOtimistaExterno: input.crescimentoMuitoOtimistaExterno,
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

export type BudgetLineCustoInput = {
  tipoCusto: "FIXO" | "MENSAL" | "POR_SACA" | "PERCENTUAL";
  valorPorSaca: number;
  valorMensal?: number;
  valorPercentual?: number;
  baseVolume: "TOTAL" | "INTERNO" | "EXTERNO";
};

// Define como o previsto da linha e formado: mes a mes (digitado), fixo mensal
// (mesmo valor nos 12 meses), por saca (R$/saca x volume do mes do plano) ou
// percentual (% da receita prevista do mes).
export async function updateBudgetLineCusto(lineId: string, input: BudgetLineCustoInput) {
  const tipoCusto = ["POR_SACA", "MENSAL", "PERCENTUAL"].includes(input.tipoCusto) ? input.tipoCusto : "FIXO";
  const valorMensal = Number(input.valorMensal);
  const valorPercentual = Number(input.valorPercentual);
  const baseVolume = ["TOTAL", "INTERNO", "EXTERNO"].includes(input.baseVolume) ? input.baseVolume : "TOTAL";
  await prisma.budgetLine.update({
    where: { id: lineId },
    data: {
      tipoCusto,
      valorPorSaca: Number.isFinite(input.valorPorSaca) ? input.valorPorSaca : 0,
      ...(input.valorMensal !== undefined ? { valorMensal: Number.isFinite(valorMensal) ? valorMensal : 0 } : {}),
      ...(input.valorPercentual !== undefined
        ? { valorPercentual: Number.isFinite(valorPercentual) ? valorPercentual : 0 }
        : {}),
      baseVolume,
    },
  });
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

// Grava a projecao (volume base e parcela externa, mes a mes) no plano.
// Recalcula no servidor a partir das vendas - nao confia em valores vindos do
// navegador - e so altera os campos previstos: realizado e receita realizada
// informados manualmente ficam intactos.
export async function aplicarProjecaoVolumes(planId: string) {
  const proj = await calcularVolumesBaseProjecao();
  if (!proj) throw new Error("Sem histórico de vendas fechado para projetar.");
  await prisma.$transaction(
    proj.meses.map((m) =>
      prisma.budgetVolumeMonth.upsert({
        where: { budgetPlanId_month: { budgetPlanId: planId, month: m.month } },
        create: { budgetPlanId: planId, month: m.month, volumeBaseSacas: m.volumeBaseSacas, volumeExternoSacas: m.volumeExternoSacas },
        update: { volumeBaseSacas: m.volumeBaseSacas, volumeExternoSacas: m.volumeExternoSacas },
      })
    )
  );
  revalidateAll();
}

// Preco R$/saca da projecao (pagina Premissas). null = voltar ao padrao
// (preco medio liquido do ultimo trimestre fechado).
export async function salvarPrecosProjecao(planId: string, precoInterno: number | null, precoExterno: number | null) {
  const ok = (v: number | null) => (v !== null && Number.isFinite(v) && v > 0 ? v : null);
  await prisma.budgetPlan.update({
    where: { id: planId },
    data: { precoSacaInterno: ok(precoInterno), precoSacaExterno: ok(precoExterno) },
  });
  revalidateAll();
}
