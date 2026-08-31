"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createTransportadoraAmostra(name: string) {
  await prisma.transportadoraAmostra.create({ data: { name } });
  revalidateAll();
}

export async function updateTransportadoraAmostra(id: string, name: string) {
  await prisma.transportadoraAmostra.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteTransportadoraAmostra(id: string) {
  await prisma.transportadoraAmostra.delete({ where: { id } });
  revalidateAll();
}
