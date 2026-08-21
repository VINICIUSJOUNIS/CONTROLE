"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type ContaGarantidaFormInput = {
  bankId: string;
  limiteContratado: number;
  taxaJurosPercent: number;
  observacao: string;
};

export type ContaGarantidaUsoFormInput = {
  contaGarantidaId: string;
  valorUtilizado: number;
  dataInicio: string;
  dataFim: string;
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

export async function createContaGarantidaUso(input: ContaGarantidaUsoFormInput) {
  await prisma.contaGarantidaUso.create({
    data: {
      contaGarantidaId: input.contaGarantidaId,
      valorUtilizado: input.valorUtilizado,
      dataInicio: parseLocalDate(input.dataInicio),
      dataFim: input.dataFim ? parseLocalDate(input.dataFim) : null,
      observacao: input.observacao || null,
    },
  });

  revalidateAll();
}

export async function updateContaGarantidaUso(id: string, input: ContaGarantidaUsoFormInput) {
  await prisma.contaGarantidaUso.update({
    where: { id },
    data: {
      valorUtilizado: input.valorUtilizado,
      dataInicio: parseLocalDate(input.dataInicio),
      dataFim: input.dataFim ? parseLocalDate(input.dataFim) : null,
      observacao: input.observacao || null,
    },
  });

  revalidateAll();
}

export async function deleteContaGarantidaUso(id: string) {
  await prisma.contaGarantidaUso.delete({ where: { id } });
  revalidateAll();
}
