"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createDescricaoCafe(name: string) {
  await prisma.descricaoCafe.create({ data: { name } });
  revalidateAll();
}

export async function updateDescricaoCafe(id: string, name: string) {
  await prisma.descricaoCafe.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteDescricaoCafe(id: string) {
  await prisma.descricaoCafe.delete({ where: { id } });
  revalidateAll();
}
