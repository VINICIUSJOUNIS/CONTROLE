"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type BankTransferChannelInput = {
  moeda: string;
  instrucoes: string;
};

export async function saveBankTransferChannel(bankId: string, input: BankTransferChannelInput) {
  await prisma.bankTransferChannel.upsert({
    where: { bankId },
    create: { bankId, ...input },
    update: { ...input },
  });

  revalidatePath("/transferencia-ordem");
}

export type TransferenciaOrdemInput = {
  cidade: string;
  data: string;
  tipo: string;
  numeroOrdem: string;
  moeda: string;
  valor: number;
  valorExtenso: string;
  bankId: string | null;
  bancoDestino: string;
  descontaTarifa: string;
  valorTarifa: number | null;
  instrucoes: string;
  observacoes: string;
};

export async function createTransferenciaOrdem(input: TransferenciaOrdemInput) {
  const created = await prisma.transferenciaOrdem.create({
    data: {
      ...input,
      data: parseLocalDate(input.data),
      bankId: input.bankId || null,
    },
  });

  revalidatePath("/transferencia-ordem");
  return created.id;
}

export async function updateTransferenciaOrdem(id: string, input: TransferenciaOrdemInput) {
  await prisma.transferenciaOrdem.update({
    where: { id },
    data: {
      ...input,
      data: parseLocalDate(input.data),
      bankId: input.bankId || null,
    },
  });

  revalidatePath("/transferencia-ordem");
}

export async function deleteTransferenciaOrdem(id: string) {
  await prisma.transferenciaOrdem.delete({ where: { id } });
  revalidatePath("/transferencia-ordem");
}
