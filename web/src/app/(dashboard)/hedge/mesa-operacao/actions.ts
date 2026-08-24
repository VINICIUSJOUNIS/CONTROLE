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

export type EnvioAmostraInput = {
  tipoAmostraId: string;
  transportadoraId: string;
  cteNumero: string;
  cteValor: string;
  notaFiscalNumero: string;
  notaFiscalValor: string;
};

export async function upsertEnvioAmostra(contratoId: string, input: EnvioAmostraInput) {
  const data = {
    tipoAmostraId: input.tipoAmostraId || null,
    transportadoraId: input.transportadoraId || null,
    cteNumero: input.cteNumero.trim() || null,
    cteValor: input.cteValor.trim() ? Number(input.cteValor) : null,
    notaFiscalNumero: input.notaFiscalNumero.trim() || null,
    notaFiscalValor: input.notaFiscalValor.trim() ? Number(input.notaFiscalValor) : null,
  };

  await prisma.contratoEnvioAmostra.upsert({
    where: { contratoId },
    create: { contratoId, ...data },
    update: data,
  });

  revalidateAll();
}

export async function setPrevisaoEtapa(contratoId: string, etapa: StatusContratoValue, dataPrevisao: string) {
  if (!dataPrevisao) {
    await prisma.contratoEtapaPrevisao.deleteMany({ where: { contratoId, etapa } });
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataPrevisao) || Number(dataPrevisao.slice(0, 4)) < 1900) {
      throw new Error("Data de previsao invalida.");
    }
    await prisma.contratoEtapaPrevisao.upsert({
      where: { contratoId_etapa: { contratoId, etapa } },
      create: { contratoId, etapa, dataPrevisao: parseLocalDate(dataPrevisao) },
      update: { dataPrevisao: parseLocalDate(dataPrevisao) },
    });
  }

  revalidateAll();
}

export async function setEtapaConcluida(contratoId: string, etapa: StatusContratoValue, concluida: boolean) {
  if (concluida) {
    await prisma.contratoEtapaConcluida.upsert({
      where: { contratoId_etapa: { contratoId, etapa } },
      create: { contratoId, etapa },
      update: {},
    });
  } else {
    await prisma.contratoEtapaConcluida.deleteMany({ where: { contratoId, etapa } });
  }

  revalidateAll();
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
  descricaoCafeId: string;
  previsaoEmbarque: string;
  destinoCarga: string;
  formaPagamentoId: string;
  diferencial: string;
  fixacaoTipo: string;
  dataFixacao: string;
  nivelBolsa: string;
  valorDolar: string;
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
    descricaoCafeId: input.descricaoCafeId || null,
    previsaoEmbarque: input.previsaoEmbarque ? parseLocalDate(input.previsaoEmbarque) : null,
    destinoCarga: input.destinoCarga.trim() || null,
    formaPagamentoId: input.formaPagamentoId || null,
    diferencial: input.diferencial.trim() ? Number(input.diferencial) : null,
    fixacaoTipo: input.fixacaoTipo || null,
    dataFixacao: input.dataFixacao ? parseLocalDate(input.dataFixacao) : null,
    nivelBolsa: input.nivelBolsa.trim() ? Number(input.nivelBolsa) : null,
    valorDolar: input.valorDolar.trim() ? Number(input.valorDolar) : null,
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
