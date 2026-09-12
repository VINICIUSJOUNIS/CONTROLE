"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createArmador(name: string) {
  await prisma.armador.create({ data: { name } });
  revalidateAll();
}

export async function updateArmador(id: string, name: string) {
  await prisma.armador.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteArmador(id: string) {
  await prisma.armador.delete({ where: { id } });
  revalidateAll();
}

export async function createItemTabelaArmador(armadorId: string, descricao: string, precoPorContainer: number) {
  await prisma.itemTabelaArmador.create({
    data: { armadorId, descricao, precoPorContainer },
  });
  revalidateAll();
}

export async function updateItemTabelaArmador(id: string, descricao: string, precoPorContainer: number) {
  await prisma.itemTabelaArmador.update({
    where: { id },
    data: { descricao, precoPorContainer },
  });
  revalidateAll();
}

export async function deleteItemTabelaArmador(id: string) {
  await prisma.itemTabelaArmador.delete({ where: { id } });
  revalidateAll();
}
