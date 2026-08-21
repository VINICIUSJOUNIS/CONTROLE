import {
  StatusContratoValue,
  DespesasContratoInput,
  RecebimentoContratoInput,
} from "@/app/(dashboard)/contratos/actions";

// As 20 etapas da Mesa de Operacao, na ordem em que sao cumpridas no processo
// de exportacao (lista fornecida pela area de operacoes).
export const statusOrder: StatusContratoValue[] = [
  "CONFIRMACAO_NEGOCIO",
  "ASSINATURA_CONTRATO",
  "ENVIO_AMOSTRA_PSS",
  "APROVACAO_AMOSTRA_PSS",
  "ENVIO_ARTE_SACARIA",
  "APROVACAO_ARTE_SACARIA",
  "ENVIO_INSTRUCAO_EMBARQUE",
  "BOOKING",
  "MARCACAO_EMBARQUE_TRANSPORTADORA",
  "ESTUFAGEM_CARREGAMENTO",
  "RECEBIMENTO_BL",
  "ENVIO_DOCUMENTOS_APROVACAO",
  "APROVACAO_DOCUMENTOS",
  "ENVIO_FINANCIAMENTO_RTS",
  "TRADUCAO_PEDIDO_LEGALIZACAO",
  "EMISSAO_CARTA_BORDERO",
  "ENVIO_DOCUMENTOS_BANCO_CLIENTE",
  "RECEBIMENTO_CLIENTE",
  "ENVIO_BL_ORIGINAL_TELEX",
  "LIBERACAO_CARGA",
];

export const statusLabels: Record<StatusContratoValue, string> = {
  CONFIRMACAO_NEGOCIO: "Confirmacao de negocio",
  ASSINATURA_CONTRATO: "Assinatura de contrato",
  ENVIO_AMOSTRA_PSS: "Envio de amostra de aprovacao (PSS)",
  APROVACAO_AMOSTRA_PSS: "Aprovacao da amostra (PSS)",
  ENVIO_ARTE_SACARIA: "Envio da arte de sacaria",
  APROVACAO_ARTE_SACARIA: "Aprovacao da arte de sacaria",
  ENVIO_INSTRUCAO_EMBARQUE: "Envio de instrucao de embarque (SI)",
  BOOKING: "Booking",
  MARCACAO_EMBARQUE_TRANSPORTADORA: "Marcacao de embarque com a transportadora (Rodoviario)",
  ESTUFAGEM_CARREGAMENTO: "Estufagem/Carregamento",
  RECEBIMENTO_BL: "Recebimento do BL",
  ENVIO_DOCUMENTOS_APROVACAO: "Envio dos documentos para aprovacao",
  APROVACAO_DOCUMENTOS: "Aprovacao dos documentos",
  ENVIO_FINANCIAMENTO_RTS: "Envio para financiamento (RTS)",
  TRADUCAO_PEDIDO_LEGALIZACAO: "Traducao e pedido de legalizacao",
  EMISSAO_CARTA_BORDERO: "Emissao da carta bordero",
  ENVIO_DOCUMENTOS_BANCO_CLIENTE: "Envio dos documentos para o banco do cliente",
  RECEBIMENTO_CLIENTE: "Recebimento do cliente",
  ENVIO_BL_ORIGINAL_TELEX: "Envio do BL original / Seaway Bill / Telex Release",
  LIBERACAO_CARGA: "Liberacao da carga",
};

// Data usada para calcular prazo/atraso em cada etapa: nas etapas anteriores a
// estufagem, monitora a data de estufagem; da estufagem ate o recebimento do BL,
// monitora a data de embarque; dali em diante (tramitacao documental e entrega),
// monitora a data de chegada.
export const relevantDateField: Record<
  StatusContratoValue,
  "dataEstufagem" | "dataEmbarque" | "dataChegada"
> = {
  CONFIRMACAO_NEGOCIO: "dataEstufagem",
  ASSINATURA_CONTRATO: "dataEstufagem",
  ENVIO_AMOSTRA_PSS: "dataEstufagem",
  APROVACAO_AMOSTRA_PSS: "dataEstufagem",
  ENVIO_ARTE_SACARIA: "dataEstufagem",
  APROVACAO_ARTE_SACARIA: "dataEstufagem",
  ENVIO_INSTRUCAO_EMBARQUE: "dataEstufagem",
  BOOKING: "dataEstufagem",
  MARCACAO_EMBARQUE_TRANSPORTADORA: "dataEstufagem",
  ESTUFAGEM_CARREGAMENTO: "dataEmbarque",
  RECEBIMENTO_BL: "dataEmbarque",
  ENVIO_DOCUMENTOS_APROVACAO: "dataChegada",
  APROVACAO_DOCUMENTOS: "dataChegada",
  ENVIO_FINANCIAMENTO_RTS: "dataChegada",
  TRADUCAO_PEDIDO_LEGALIZACAO: "dataChegada",
  EMISSAO_CARTA_BORDERO: "dataChegada",
  ENVIO_DOCUMENTOS_BANCO_CLIENTE: "dataChegada",
  RECEBIMENTO_CLIENTE: "dataChegada",
  ENVIO_BL_ORIGINAL_TELEX: "dataChegada",
  LIBERACAO_CARGA: "dataChegada",
};

export const dateFieldLabels: Record<"dataEstufagem" | "dataEmbarque" | "dataChegada", string> = {
  dataEstufagem: "Estufagem",
  dataEmbarque: "Embarque",
  dataChegada: "Chegada",
};

export const despesaLabels: Record<keyof DespesasContratoInput, string> = {
  despachante: "Despachante",
  certificados: "Certificados",
  freteTerrestre: "Frete terrestre",
  freteMaritimo: "Frete maritimo",
  taxasLocaisArmador: "Taxas locais por armador",
  fumigacao: "Fumigacao",
  embalagens: "Embalagens",
  inspecao: "Inspecao",
  despesasPortuarias: "Despesas portuarias",
  armazem: "Armazem",
  envioAmostra: "Envio de amostra",
  marcacaoSacaria: "Marcacao de sacaria",
  envioDocumentacao: "Envio de documentacao (Pierdoc/Cliente)",
  telexRelease: "Telex release",
  legalizacao: "Legalizacao",
  financiamentoRts: "Financiamento RTS",
  diariaContainerDetention: "Diaria de container / Detention",
  despesasRedex: "Despesas com Redex",
  estadiaContainer: "Estadia de container",
};

export const despesaKeys = Object.keys(despesaLabels) as (keyof DespesasContratoInput)[];

export function emptyDespesasForm(): Record<keyof DespesasContratoInput, string> {
  return Object.fromEntries(despesaKeys.map((k) => [k, "0"])) as Record<
    keyof DespesasContratoInput,
    string
  >;
}

export type Cliente = { id: string; name: string; city: string | null; country: string };
export type Corretora = { id: string; name: string; color: string };

export const recebimentoLabels: Record<
  Exclude<keyof RecebimentoContratoInput, "financiadoPelaRts" | "obsRecebimento">,
  string
> = {
  quantSacas: "Quantidade de sacas",
  adiantamentoUsd: "Adiantamento (US$)",
  dataAdiantamento: "Data do adiantamento",
  valorFinanciadoRtsUsd: "Valor financiado pela RTS (US$)",
  dataLiberacaoFinanciamentoRts: "Data da liberacao do financiamento",
  previsaoPagamentoCliente: "Previsao de pagamento do cliente",
  saldoAReceberRtsUsd: "Saldo a receber (US$)",
  valorRecebidoRtsUsd: "Valor recebido (US$)",
  dataRecebimentoRts: "Data do recebimento",
};

export function emptyRecebimentoForm(): Record<keyof RecebimentoContratoInput, string> {
  return {
    quantSacas: "",
    adiantamentoUsd: "0",
    dataAdiantamento: "",
    financiadoPelaRts: "false",
    valorFinanciadoRtsUsd: "0",
    dataLiberacaoFinanciamentoRts: "",
    previsaoPagamentoCliente: "",
    saldoAReceberRtsUsd: "0",
    valorRecebidoRtsUsd: "0",
    dataRecebimentoRts: "",
    obsRecebimento: "",
  };
}
