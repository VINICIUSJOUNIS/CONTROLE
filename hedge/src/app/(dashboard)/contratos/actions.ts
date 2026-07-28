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

export type DespesasContratoInput = {
  despachante: number;
  certificados: number;
  freteTerrestre: number;
  freteMaritimo: number;
  taxasLocaisArmador: number;
  fumigacao: number;
  embalagens: number;
  inspecao: number;
  despesasPortuarias: number;
  armazem: number;
  envioAmostra: number;
  marcacaoSacaria: number;
  envioDocumentacao: number;
  telexRelease: number;
  legalizacao: number;
  financiamentoRts: number;
  diariaContainerDetention: number;
  despesasRedex: number;
  estadiaContainer: number;
};

export type ContratoFormInput = {
  contractNumber: string;
  clienteId: string;
  corretoraId: string | null;
  country: string;
  valorUsd: number;
  dataEstufagem: string;
  dataEmbarque: string;
  dataChegada: string;
  status: StatusContratoValue;
  despesas: DespesasContratoInput;
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
      corretoraId: input.corretoraId,
      country: input.country,
      valorUsd: input.valorUsd,
      dataEstufagem: input.dataEstufagem ? parseLocalDate(input.dataEstufagem) : null,
      dataEmbarque: input.dataEmbarque ? parseLocalDate(input.dataEmbarque) : null,
      dataChegada: input.dataChegada ? parseLocalDate(input.dataChegada) : null,
      status: input.status,
      ...input.despesas,
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
      corretoraId: input.corretoraId,
      country: input.country,
      valorUsd: input.valorUsd,
      dataEstufagem: input.dataEstufagem ? parseLocalDate(input.dataEstufagem) : null,
      dataEmbarque: input.dataEmbarque ? parseLocalDate(input.dataEmbarque) : null,
      dataChegada: input.dataChegada ? parseLocalDate(input.dataChegada) : null,
      status: input.status,
      ...input.despesas,
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
