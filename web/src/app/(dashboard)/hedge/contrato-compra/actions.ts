"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type ContratoCompraCafeInput = {
  numeroContrato: string;
  dataContrato: string;
  tipoOperacao: string;
  modalidade: string;
  referenciaPagamento: string;
  codigoComprador: string;
  nomeComprador: string;
  cnpjComprador: string;
  enderecoComprador: string;
  inscricaoEstadualComprador: string;
  grupoComprador: string;
  corretor: string;
  comissaoCorretor: number;
  agente: string;
  comissaoAgente: number;
  descricaoProduto: string;
  safra: string;
  padrao: string;
  bebida: string;
  tipoEmbalagem: string;
  valorLivrePorSaca: number;
  quantidadeSacas: number;
  valorFaturadoPorSaca: number;
  creditoIcms: string;
  condicaoPagamento: string;
  banco: string;
  agencia: string;
  conta: string;
  observacoes: string;
  localRetirada: string;
  codigoLocalEntrega: string;
  previsaoEntrega: string | null;
  nomeLocalEntrega: string;
  cnpjLocalEntrega: string;
  enderecoLocalEntrega: string;
  cidadeLocalEntrega: string;
};

function toData(input: ContratoCompraCafeInput) {
  return {
    ...input,
    dataContrato: parseLocalDate(input.dataContrato),
    previsaoEntrega: input.previsaoEntrega ? parseLocalDate(input.previsaoEntrega) : null,
  };
}

export async function createContratoCompraCafe(input: ContratoCompraCafeInput) {
  const created = await prisma.contratoCompraCafe.create({ data: toData(input) });
  revalidatePath("/hedge/contrato-compra");
  return created.id;
}

export async function updateContratoCompraCafe(id: string, input: ContratoCompraCafeInput) {
  await prisma.contratoCompraCafe.update({ where: { id }, data: toData(input) });
  revalidatePath("/hedge/contrato-compra");
}

export async function deleteContratoCompraCafe(id: string) {
  await prisma.contratoCompraCafe.delete({ where: { id } });
  revalidatePath("/hedge/contrato-compra");
}
