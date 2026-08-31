"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createFormaPagamento(name: string) {
  await prisma.formaPagamento.create({ data: { name } });
  revalidateAll();
}

export async function updateFormaPagamento(id: string, name: string) {
  await prisma.formaPagamento.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteFormaPagamento(id: string) {
  await prisma.formaPagamento.delete({ where: { id } });
  revalidateAll();
}
