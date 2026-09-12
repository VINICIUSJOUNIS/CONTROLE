"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createEmpresaFreteMaritimo(name: string) {
  await prisma.empresaFreteMaritimo.create({ data: { name } });
  revalidateAll();
}

export async function updateEmpresaFreteMaritimo(id: string, name: string) {
  await prisma.empresaFreteMaritimo.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteEmpresaFreteMaritimo(id: string) {
  await prisma.empresaFreteMaritimo.delete({ where: { id } });
  revalidateAll();
}

export async function createItemTabelaFreteMaritimo(empresaId: string, descricao: string, precoPorContainer: number) {
  await prisma.itemTabelaFreteMaritimo.create({
    data: { empresaId, descricao, precoPorContainer },
  });
  revalidateAll();
}

export async function updateItemTabelaFreteMaritimo(id: string, descricao: string, precoPorContainer: number) {
  await prisma.itemTabelaFreteMaritimo.update({
    where: { id },
    data: { descricao, precoPorContainer },
  });
  revalidateAll();
}

export async function deleteItemTabelaFreteMaritimo(id: string) {
  await prisma.itemTabelaFreteMaritimo.delete({ where: { id } });
  revalidateAll();
}
