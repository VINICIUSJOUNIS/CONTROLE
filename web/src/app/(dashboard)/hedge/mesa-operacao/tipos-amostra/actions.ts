"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createTipoAmostra(name: string) {
  await prisma.tipoAmostra.create({ data: { name } });
  revalidateAll();
}

export async function updateTipoAmostra(id: string, name: string) {
  await prisma.tipoAmostra.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteTipoAmostra(id: string) {
  await prisma.tipoAmostra.delete({ where: { id } });
  revalidateAll();
}
