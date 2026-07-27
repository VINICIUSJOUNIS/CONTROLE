"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type StatusContratoValue =
  | "CONTRATO_ASSINADO"
  | "PRE_EMBARQUE"
  | "ESTUFAGEM_PORTO"
  | "EMBARCADO"
  | "CARGA_DESTINO"
  | "CONTRATO_FINALIZADO";

export type ContratoFormInput = {
  contractNumber: string;
  clienteId: string;
  valorUsd: number;
  dataEstufagem: string;
  dataEmbarque: string;
  dataChegada: string;
  status: StatusContratoValue;
};

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/contratos");
}

export async function createContrato(input: ContratoFormInput) {
  await prisma.contratoExportacao.create({
    data: {
      contractNumber: input.contractNumber,
      clienteId: input.clienteId,
      valorUsd: input.valorUsd,
      dataEstufagem: input.dataEstufagem ? parseLocalDate(input.dataEstufagem) : null,
      dataEmbarque: input.dataEmbarque ? parseLocalDate(input.dataEmbarque) : null,
      dataChegada: input.dataChegada ? parseLocalDate(input.dataChegada) : null,
      status: input.status,
    },
  });

  revalidateAll();
}

export async function updateContrato(id: string, input: ContratoFormInput) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: {
      contractNumber: input.contractNumber,
      clienteId: input.clienteId,
      valorUsd: input.valorUsd,
      dataEstufagem: input.dataEstufagem ? parseLocalDate(input.dataEstufagem) : null,
      dataEmbarque: input.dataEmbarque ? parseLocalDate(input.dataEmbarque) : null,
      dataChegada: input.dataChegada ? parseLocalDate(input.dataChegada) : null,
      status: input.status,
    },
  });

  revalidateAll();
}

export async function deleteContrato(id: string) {
  await prisma.contratoExportacao.delete({ where: { id } });
  revalidateAll();
}

export async function updateContratoStatus(id: string, status: StatusContratoValue) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: { status },
  });

  revalidateAll();
}
