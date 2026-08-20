"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type ContaGarantidaFormInput = {
  bankId: string;
  limiteContratado: number;
  valorUtilizado: number;
  dataUtilizacao: string;
  taxaJurosPercent: number;
  observacao: string;
};

function revalidateAll() {
  revalidatePath("/conta-garantida");
}

export async function createContaGarantida(input: ContaGarantidaFormInput) {
  await prisma.contaGarantida.create({
    data: {
      bankId: input.bankId,
      limiteContratado: input.limiteContratado,
      valorUtilizado: input.valorUtilizado,
      dataUtilizacao: input.dataUtilizacao ? parseLocalDate(input.dataUtilizacao) : null,
      taxaJurosPercent: input.taxaJurosPercent,
      observacao: input.observacao || null,
    },
  });

  revalidateAll();
}

export async function updateContaGarantida(id: string, input: ContaGarantidaFormInput) {
  await prisma.contaGarantida.update({
    where: { id },
    data: {
      bankId: input.bankId,
      limiteContratado: input.limiteContratado,
      valorUtilizado: input.valorUtilizado,
      dataUtilizacao: input.dataUtilizacao ? parseLocalDate(input.dataUtilizacao) : null,
      taxaJurosPercent: input.taxaJurosPercent,
      observacao: input.observacao || null,
    },
  });

  revalidateAll();
}

export async function deleteContaGarantida(id: string) {
  await prisma.contaGarantida.delete({ where: { id } });
  revalidateAll();
}
