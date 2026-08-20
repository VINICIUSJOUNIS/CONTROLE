"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ContaGarantidaFormInput = {
  bankId: string;
  limiteContratado: number;
  valorUtilizado: number;
  taxaJurosPercent: number;
  iofPercent: number;
  iofAdicionalPercent: number;
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
      taxaJurosPercent: input.taxaJurosPercent,
      iofPercent: input.iofPercent,
      iofAdicionalPercent: input.iofAdicionalPercent,
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
      taxaJurosPercent: input.taxaJurosPercent,
      iofPercent: input.iofPercent,
      iofAdicionalPercent: input.iofAdicionalPercent,
      observacao: input.observacao || null,
    },
  });

  revalidateAll();
}

export async function deleteContaGarantida(id: string) {
  await prisma.contaGarantida.delete({ where: { id } });
  revalidateAll();
}
