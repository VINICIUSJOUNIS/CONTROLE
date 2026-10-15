"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { NATUREZAS, type Natureza } from "@/lib/credito/despesas";

// Reclassifica uma conta para todos os meses. natureza null volta para a regra padrao.
export async function reclassificarConta(classificacao: string, natureza: Natureza | null, categoria: string) {
  if (natureza === null) {
    await prisma.classificacaoDespesa.deleteMany({ where: { classificacao } });
  } else {
    if (!NATUREZAS.includes(natureza)) throw new Error("Natureza inválida.");
    await prisma.classificacaoDespesa.upsert({
      where: { classificacao },
      update: { natureza, categoria },
      create: { classificacao, natureza, categoria },
    });
  }
  revalidatePath("/credito/despesas-fixas");
}

export async function excluirBalanceteDespesas(id: string) {
  await prisma.balanceteDespesas.delete({ where: { id } });
  revalidatePath("/credito/despesas-fixas");
}
