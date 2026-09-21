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
  correcaoBL: number;
  fumigacao: number;
  embalagens: number;
  inspecao: number;
  despesasPortuarias: number;
  armazem: number;
  envioAmostra: number;
  marcacaoSacaria: number;
  freteEntregaSacaria: number;
  envioDocumentacao: number;
  seawayBill: number;
  envioDocumentosCliente: number;
  telexRelease: number;
  traducao: number;
  legalizacao: number;
  apostilamento: number;
  bancoCartaBordero: number;
  awbBancoCliente: number;
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
  dataInicioContrato: string;
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
      dataInicioContrato: input.dataInicioContrato ? parseLocalDate(input.dataInicioContrato) : null,
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
      dataInicioContrato: input.dataInicioContrato ? parseLocalDate(input.dataInicioContrato) : null,
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

export type ContratoDatasInput = {
  dataInicioContrato: string;
  dataEstufagem: string;
  dataEmbarque: string;
  dataChegada: string;
};

// Edicao rapida das datas gerais do contrato (inicio, estufagem, embarque
// e chegada do navio) direto no card de qualquer etapa da Mesa de
// Operacao, sem precisar abrir a tela de Contratos.
export async function updateContratoDatas(id: string, input: ContratoDatasInput) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: {
      dataInicioContrato: input.dataInicioContrato ? parseLocalDate(input.dataInicioContrato) : null,
      dataEstufagem: input.dataEstufagem ? parseLocalDate(input.dataEstufagem) : null,
      dataEmbarque: input.dataEmbarque ? parseLocalDate(input.dataEmbarque) : null,
      dataChegada: input.dataChegada ? parseLocalDate(input.dataChegada) : null,
    },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

// Edicao rapida do frete de entrega da sacaria direto no card da etapa
// Aprovacao da Arte de Sacaria da Mesa de Operacao, sem precisar abrir a
// tela de Contratos.
export async function updateFreteEntregaSacaria(id: string, valor: string) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: { freteEntregaSacaria: Number(valor) || 0 },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

export type CustosEstufagemInput = {
  armazem: string;
};

// Edicao rapida do custo de armazenagem direto no card da etapa
// Estufagem/Carregamento da Mesa de Operacao, sem precisar abrir a tela de
// Contratos. O transporte rodoviario e as embalagens sao calculados a
// parte (ver upsertTransporteRodoviario e addContratoEmbalagem).
export async function updateCustosEstufagem(id: string, input: CustosEstufagemInput) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: {
      armazem: Number(input.armazem) || 0,
    },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

export type CustosRecebimentoBLInput = {
  correcaoBL: string;
  despesasPortuarias: string;
  freteMaritimo: string;
  taxasLocaisArmador: string;
};

// Edicao rapida da correcao de BL (se aplicavel), das taxas portuarias e do
// valor direto do frete maritimo (se aplicavel) no card da etapa
// Recebimento do BL da Mesa de Operacao. As taxas locais do armador e o
// frete maritimo por tabela sao calculados a parte (ver
// upsertTaxasLocaisArmador e upsertFreteMaritimo) e, quando ha itens
// escolhidos na tabela da empresa, substituem o valor direto do frete.
export async function updateCustosRecebimentoBL(id: string, input: CustosRecebimentoBLInput) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: {
      correcaoBL: Number(input.correcaoBL) || 0,
      despesasPortuarias: Number(input.despesasPortuarias) || 0,
      freteMaritimo: Number(input.freteMaritimo) || 0,
      taxasLocaisArmador: Number(input.taxasLocaisArmador) || 0,
    },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

export type CustosEnvioDocumentosInput = {
  despachante: string;
  fumigacao: string;
};

// Edicao rapida do custo de despachante e da fumigacao (se aplicavel)
// direto no card da etapa Envio dos documentos para aprovacao da Mesa de
// Operacao. Os certificados sao lancados a parte (ver
// addContratoCertificado), um por um.
export async function updateCustosEnvioDocumentos(id: string, input: CustosEnvioDocumentosInput) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: {
      despachante: Number(input.despachante) || 0,
      fumigacao: Number(input.fumigacao) || 0,
    },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

// Edicao rapida do custo de financiamento direto no card da etapa Envio
// para financiamento (RTS) da Mesa de Operacao. O AWB de envio dos
// documentos e lancado a parte (ver upsertAwbDocumentacao).
export async function updateCustoFinanciamento(id: string, valor: string) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: { financiamentoRts: Number(valor) || 0 },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

export type CustosTraducaoLegalizacaoInput = {
  traducao: string;
  legalizacao: string;
  apostilamento: string;
};

// Edicao rapida do custo de traducao, legalizacao e apostilamento (se aplicavel) direto
// no card da etapa Traducao e pedido de legalizacao da Mesa de Operacao.
export async function updateCustosTraducaoLegalizacao(id: string, input: CustosTraducaoLegalizacaoInput) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: {
      traducao: Number(input.traducao) || 0,
      legalizacao: Number(input.legalizacao) || 0,
      apostilamento: Number(input.apostilamento) || 0,
    },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

export type CustosCartaBorderoInput = {
  bancoCartaBordero: string;
  awbBancoCliente: string;
};

// Edicao rapida do custo do banco para emissao da carta bordero e do custo
// do AWB de envio dos documentos para o banco do cliente, direto no card da
// etapa Emissao da carta bordero da Mesa de Operacao.
export async function updateCustosCartaBordero(id: string, input: CustosCartaBorderoInput) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: {
      bancoCartaBordero: Number(input.bancoCartaBordero) || 0,
      awbBancoCliente: Number(input.awbBancoCliente) || 0,
    },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}

export type CustosEnvioBlInput = {
  seawayBill: string;
  telexRelease: string;
  envioDocumentosCliente: string;
};

// Edicao rapida do custo de seaway bill, telex release (se aplicavel) e
// envio dos documentos para o cliente direto no card da etapa Envio do BL original / Seaway Bill / Telex Release
// da Mesa de Operacao.
export async function updateCustosEnvioBl(id: string, input: CustosEnvioBlInput) {
  await prisma.contratoExportacao.update({
    where: { id },
    data: {
      seawayBill: Number(input.seawayBill) || 0,
      telexRelease: Number(input.telexRelease) || 0,
      envioDocumentosCliente: Number(input.envioDocumentosCliente) || 0,
    },
  });

  revalidateAll();
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}
