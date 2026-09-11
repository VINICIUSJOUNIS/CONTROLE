"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createTransportadoraRodoviaria(name: string) {
  await prisma.transportadoraRodoviaria.create({ data: { name } });
  revalidateAll();
}

export async function updateTransportadoraRodoviaria(id: string, name: string) {
  await prisma.transportadoraRodoviaria.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteTransportadoraRodoviaria(id: string) {
  await prisma.transportadoraRodoviaria.delete({ where: { id } });
  revalidateAll();
}

export async function createItemTabelaTransportadora(
  transportadoraId: string,
  descricao: string,
  precoPorContainer: number
) {
  await prisma.itemTabelaTransportadora.create({
    data: { transportadoraId, descricao, precoPorContainer },
  });
  revalidateAll();
}

export async function updateItemTabelaTransportadora(
  id: string,
  descricao: string,
  precoPorContainer: number
) {
  await prisma.itemTabelaTransportadora.update({
    where: { id },
    data: { descricao, precoPorContainer },
  });
  revalidateAll();
}

export async function deleteItemTabelaTransportadora(id: string) {
  await prisma.itemTabelaTransportadora.delete({ where: { id } });
  revalidateAll();
}
