"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FaixaCoresMarcacaoValue } from "@/lib/contrato-shared";

function revalidateAll() {
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createFornecedorMarcacaoSacaria(name: string) {
  await prisma.fornecedorMarcacaoSacaria.create({ data: { name } });
  revalidateAll();
}

export async function updateFornecedorMarcacaoSacaria(id: string, name: string) {
  await prisma.fornecedorMarcacaoSacaria.update({ where: { id }, data: { name } });
  revalidateAll();
}

export async function deleteFornecedorMarcacaoSacaria(id: string) {
  await prisma.fornecedorMarcacaoSacaria.delete({ where: { id } });
  revalidateAll();
}

// Salva o preco por saca de uma faixa de cores especifica da tabela do
// fornecedor - uma celula por vez, seguindo o padrao de salvar ao perder o
// foco usado no resto da tela de Cadastros.
export async function setPrecoMarcacaoSacaria(
  fornecedorId: string,
  faixaCores: FaixaCoresMarcacaoValue,
  precoPorSaca: number
) {
  await prisma.tabelaPrecoMarcacaoSacaria.upsert({
    where: { fornecedorId_faixaCores: { fornecedorId, faixaCores } },
    create: { fornecedorId, faixaCores, precoPorSaca },
    update: { precoPorSaca },
  });
  revalidateAll();
}
