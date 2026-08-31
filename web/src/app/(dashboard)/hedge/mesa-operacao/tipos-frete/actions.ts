"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createTipoFrete(name: string) {
  await prisma.tipoFrete.create({ data: { name } });
  revalidateAll();
}

export async function updateTipoFrete(id: string, name: string) {
  await prisma.tipoFrete.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteTipoFrete(id: string) {
  await prisma.tipoFrete.delete({ where: { id } });
  revalidateAll();
}
