import {
  StatusContratoValue,
  DespesasContratoInput,
  RecebimentoContratoInput,
} from "@/app/(dashboard)/contratos/actions";

export const statusOrder: StatusContratoValue[] = [
  "CONTRATO_ASSINADO",
  "PRE_EMBARQUE",
  "ESTUFAGEM_PORTO",
  "EMBARCADO",
  "CARGA_DESTINO",
  "CONTRATO_FINALIZADO",
];

export const statusLabels: Record<StatusContratoValue, string> = {
  CONTRATO_ASSINADO: "Contrato assinado",
  PRE_EMBARQUE: "Pre embarque",
  ESTUFAGEM_PORTO: "Estufagem/Porto",
  EMBARCADO: "Embarcado",
  CARGA_DESTINO: "Carga no destino",
  CONTRATO_FINALIZADO: "Contrato finalizado",
};

export const relevantDateField: Record<
  StatusContratoValue,
  "dataEstufagem" | "dataEmbarque" | "dataChegada"
> = {
  CONTRATO_ASSINADO: "dataEstufagem",
  PRE_EMBARQUE: "dataEstufagem",
  ESTUFAGEM_PORTO: "dataEmbarque",
  EMBARCADO: "dataChegada",
  CARGA_DESTINO: "dataChegada",
  CONTRATO_FINALIZADO: "dataChegada",
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
