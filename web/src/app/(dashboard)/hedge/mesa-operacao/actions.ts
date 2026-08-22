"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type ConfirmacaoNegocioInput = {
  dataConfirmacao: string;
  numeroContrato: string;
  corretoraId: string;
  clienteId: string;
  valorUsd: number;
  frete: number;
  tipoEmbalagem: string;
  quantidadeSacas: number | null;
  descricaoCafe: string;
  previsaoEmbarque: string;
  destinoCarga: string;
  formaPagamento: string;
};

export async function upsertConfirmacaoNegocio(contratoId: string, input: ConfirmacaoNegocioInput) {
  const data = {
    dataConfirmacao: input.dataConfirmacao ? parseLocalDate(input.dataConfirmacao) : null,
    numeroContrato: input.numeroContrato.trim() || null,
    corretoraId: input.corretoraId || null,
    clienteId: input.clienteId || null,
    valorUsd: input.valorUsd,
    frete: input.frete,
    tipoEmbalagem: input.tipoEmbalagem.trim() || null,
    quantidadeSacas: input.quantidadeSacas,
    descricaoCafe: input.descricaoCafe.trim() || null,
    previsaoEmbarque: input.previsaoEmbarque ? parseLocalDate(input.previsaoEmbarque) : null,
    destinoCarga: input.destinoCarga.trim() || null,
    formaPagamento: input.formaPagamento.trim() || null,
  };

  await prisma.contratoConfirmacaoNegocio.upsert({
    where: { contratoId },
    create: { contratoId, ...data },
    update: data,
  });

  revalidatePath("/hedge/mesa-operacao/confirmacao-negocio");
}
