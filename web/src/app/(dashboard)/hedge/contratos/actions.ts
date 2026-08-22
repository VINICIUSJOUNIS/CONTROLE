"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type StatusContratoValue =
  | "CONFIRMACAO_NEGOCIO"
  | "ASSINATURA_CONTRATO"
  | "PROFORMA_INVOICE"
  | "ENVIO_AMOSTRA_PSS"
  | "APROVACAO_AMOSTRA_PSS"
  | "ENVIO_ARTE_SACARIA"
  | "APROVACAO_ARTE_SACARIA"
  | "ENVIO_INSTRUCAO_EMBARQUE"
  | "BOOKING"
  | "MARCACAO_EMBARQUE_TRANSPORTADORA"
  | "ESTUFAGEM_CARREGAMENTO"
  | "RECEBIMENTO_BL"
  | "ENVIO_DOCUMENTOS_APROVACAO"
  | "APROVACAO_DOCUMENTOS"
  | "ENVIO_FINANCIAMENTO_RTS"
  | "TRADUCAO_PEDIDO_LEGALIZACAO"
  | "EMISSAO_CARTA_BORDERO"
  | "ENVIO_DOCUMENTOS_BANCO_CLIENTE"
  | "RECEBIMENTO_CLIENTE"
  | "ENVIO_BL_ORIGINAL_TELEX"
  | "LIBERACAO_CARGA";

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

export type RecebimentoContratoInput = {
  quantSacas: number | null;
  adiantamentoUsd: number;
  dataAdiantamento: string;
  financiadoPelaRts: boolean;
  valorFinanciadoRtsUsd: number;
  dataLiberacaoFinanciamentoRts: string;
  previsaoPagamentoCliente: string;
  saldoAReceberRtsUsd: number;
  valorRecebidoRtsUsd: number;
  dataRecebimentoRts: string;
  obsRecebimento: string;
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
  recebimento: RecebimentoContratoInput;
};

function revalidateAll() {
  revalidatePath("/hedge");
  revalidatePath("/hedge/contratos");
}

function recebimentoData(recebimento: RecebimentoContratoInput) {
  return {
    quantSacas: recebimento.quantSacas,
    adiantamentoUsd: recebimento.adiantamentoUsd,
    dataAdiantamento: recebimento.dataAdiantamento ? parseLocalDate(recebimento.dataAdiantamento) : null,
    financiadoPelaRts: recebimento.financiadoPelaRts,
    valorFinanciadoRtsUsd: recebimento.valorFinanciadoRtsUsd,
    dataLiberacaoFinanciamentoRts: recebimento.dataLiberacaoFinanciamentoRts
      ? parseLocalDate(recebimento.dataLiberacaoFinanciamentoRts)
      : null,
    previsaoPagamentoCliente: recebimento.previsaoPagamentoCliente
      ? parseLocalDate(recebimento.previsaoPagamentoCliente)
      : null,
    saldoAReceberRtsUsd: recebimento.saldoAReceberRtsUsd,
    valorRecebidoRtsUsd: recebimento.valorRecebidoRtsUsd,
    dataRecebimentoRts: recebimento.dataRecebimentoRts ? parseLocalDate(recebimento.dataRecebimentoRts) : null,
    obsRecebimento: recebimento.obsRecebimento || null,
  };
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
      ...recebimentoData(input.recebimento),
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
      ...recebimentoData(input.recebimento),
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
