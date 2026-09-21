"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createTipoFixacao(name: string) {
  await prisma.tipoFixacao.create({ data: { name } });
  revalidateAll();
}

export async function updateTipoFixacao(id: string, name: string) {
  await prisma.tipoFixacao.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteTipoFixacao(id: string) {
  await prisma.tipoFixacao.delete({ where: { id } });
  revalidateAll();
}
