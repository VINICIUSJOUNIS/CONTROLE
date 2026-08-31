"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createPadraoCafe(name: string) {
  await prisma.padraoCafe.create({ data: { name } });
  revalidateAll();
}

export async function updatePadraoCafe(id: string, name: string) {
  await prisma.padraoCafe.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deletePadraoCafe(id: string) {
  await prisma.padraoCafe.delete({ where: { id } });
  revalidateAll();
}
