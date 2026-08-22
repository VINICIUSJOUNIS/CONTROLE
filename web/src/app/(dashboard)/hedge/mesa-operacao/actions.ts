"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";
import { StatusContratoValue } from "@/app/(dashboard)/hedge/contratos/actions";

function revalidateAll() {
  revalidatePath("/hedge");
  revalidatePath("/hedge/contratos");
  revalidatePath("/hedge/mesa-operacao");
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

export type AddContratoAnexoInput = {
  contratoId: string;
  etapa: StatusContratoValue;
  fileName: string;
  fileUrl: string;
  fileSize: number;
};

// O upload em si (para o Supabase Storage) acontece no navegador; esta acao
// so grava a referencia do arquivo ja enviado.
export async function addContratoAnexo(input: AddContratoAnexoInput) {
  await prisma.contratoAnexo.create({
    data: {
      contratoId: input.contratoId,
      etapa: input.etapa,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
    },
  });

  revalidateAll();
}

export async function deleteContratoAnexo(id: string) {
  await prisma.contratoAnexo.delete({ where: { id } });
  revalidateAll();
}

export type ConfirmacaoNegocioInput = {
  dataConfirmacao: string;
  numeroContrato: string;
  corretoraId: string;
  clienteId: string;
  valorUsd: number;
  frete: string;
  tipoEmbalagemId: string;
  quantidadeSacas: number | null;
  descricaoCafe: string;
  previsaoEmbarque: string;
  destinoCarga: string;
  formaPagamento: string;
};

function confirmacaoData(input: ConfirmacaoNegocioInput) {
  return {
    dataConfirmacao: input.dataConfirmacao ? parseLocalDate(input.dataConfirmacao) : null,
    numeroContrato: input.numeroContrato.trim() || null,
    corretoraId: input.corretoraId || null,
    clienteId: input.clienteId || null,
    valorUsd: input.valorUsd,
    frete: input.frete || null,
    tipoEmbalagemId: input.tipoEmbalagemId || null,
    quantidadeSacas: input.quantidadeSacas,
    descricaoCafe: input.descricaoCafe.trim() || null,
    previsaoEmbarque: input.previsaoEmbarque ? parseLocalDate(input.previsaoEmbarque) : null,
    destinoCarga: input.destinoCarga.trim() || null,
    formaPagamento: input.formaPagamento.trim() || null,
  };
}

export async function upsertConfirmacaoNegocio(contratoId: string, input: ConfirmacaoNegocioInput) {
  const data = confirmacaoData(input);

  await prisma.contratoConfirmacaoNegocio.upsert({
    where: { contratoId },
    create: { contratoId, ...data },
    update: data,
  });

  revalidateAll();
}

// Cadastra o contrato direto pela etapa "Confirmacao de Negocio" da Mesa de
// Operacao (em vez de exigir criar antes pela tela de Contratos): cria o
// ContratoExportacao (que entra na mesa ja em CONFIRMACAO_NEGOCIO) e a ficha
// da etapa juntos, na mesma transacao.
export async function createContratoComConfirmacao(input: ConfirmacaoNegocioInput) {
  const numeroContrato = input.numeroContrato.trim();
  if (!numeroContrato) throw new Error("Informe o numero do contrato.");
  if (!input.clienteId) throw new Error("Selecione o cliente.");

  await prisma.$transaction(async (tx) => {
    const contrato = await tx.contratoExportacao.create({
      data: {
        contractNumber: numeroContrato,
        clienteId: input.clienteId,
        corretoraId: input.corretoraId || null,
        country: input.destinoCarga.trim(),
        valorUsd: input.valorUsd,
        status: "CONFIRMACAO_NEGOCIO",
      },
    });

    await tx.contratoConfirmacaoNegocio.create({
      data: { contratoId: contrato.id, ...confirmacaoData(input) },
    });
  });

  revalidateAll();
}
