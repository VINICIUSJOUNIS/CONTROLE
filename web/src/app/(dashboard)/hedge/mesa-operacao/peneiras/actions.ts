"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createPeneira(name: string) {
  await prisma.peneira.create({ data: { name } });
  revalidateAll();
}

export async function updatePeneira(id: string, name: string) {
  await prisma.peneira.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deletePeneira(id: string) {
  await prisma.peneira.delete({ where: { id } });
  revalidateAll();
}
