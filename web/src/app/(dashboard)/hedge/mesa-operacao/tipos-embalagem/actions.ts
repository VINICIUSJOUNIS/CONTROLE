"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createTipoEmbalagem(name: string) {
  await prisma.tipoEmbalagem.create({ data: { name } });
  revalidateAll();
}

export async function updateTipoEmbalagem(id: string, name: string) {
  await prisma.tipoEmbalagem.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteTipoEmbalagem(id: string) {
  await prisma.tipoEmbalagem.delete({ where: { id } });
  revalidateAll();
}
