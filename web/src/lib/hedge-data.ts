import { prisma } from "@/lib/prisma";
import { StatusContratoValue } from "@/app/(dashboard)/hedge/contratos/actions";
import {
  statusOrder,
  statusLabels,
  EtapaStatusValue,
  FaixaCoresMarcacaoValue,
  faixaCoresOrder,
} from "@/lib/contrato-shared";
import { alertaPrazo, AlertaPrazo } from "@/lib/prazo";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getCorretoras() {
  const corretoras = await prisma.corretora.findMany({ orderBy: { name: "asc" } });
  return corretoras.map((c) => ({ id: c.id, name: c.name, color: c.color }));
}

export type HedgeRow = Awaited<ReturnType<typeof getHedgeOperations>>[number];

export async function getHedgeOperations() {
  const operations = await prisma.hedgeOperation.findMany({
    include: { corretora: true },
    orderBy: { contractDate: "desc" },
  });

  return operations.map((op) => {
    const valorUsd = Number(op.valorUsd);
    const liquidacaoParcialUsd = Number(op.liquidacaoParcialUsd);
    const nivelCompra = Number(op.nivelCompra);
    const nivelVenda = Number(op.nivelVenda);
    const desagioValor = Number(op.desagioValor);
    const saldoUsd = Number((valorUsd - liquidacaoParcialUsd).toFixed(2));
    const totalReais = Number(op.totalReais);

    return {
      id: op.id,
      corretoraId: op.corretoraId,
      corretoraName: op.corretora.name,
      contractType: op.contractType,
      side: op.side,
      contractDate: toISODate(op.contractDate),
      vencimento: toISODate(op.vencimento),
      valorUsd,
      liquidacaoParcialUsd,
      saldoUsd,
      nivelCompra,
      nivelVenda,
      desagioValor,
      totalReais,
      status: op.status,
      observacao: op.observacao,
    };
  });
}

// Traz para a lista de clientes do hedge (Cliente) qualquer cliente que ja
// esteja cadastrado nas Vendas Externas (Sale com clientType EXTERNO) mas
// ainda nao exista aqui, para poder reaproveitar o mesmo cadastro na Mesa de
// Operacao em vez de digitar de novo.
export async function syncClientesFromVendasExternas() {
  const [vendasExternas, existentes] = await Promise.all([
    prisma.sale.findMany({
      where: { clientType: "EXTERNO" },
      select: { clientName: true, country: true },
      distinct: ["clientName"],
    }),
    prisma.cliente.findMany({ select: { name: true } }),
  ]);

  const nomesExistentes = new Set(existentes.map((c) => c.name.trim().toLowerCase()));
  const faltantes = vendasExternas.filter(
    (v) => v.clientName.trim() && !nomesExistentes.has(v.clientName.trim().toLowerCase())
  );

  if (faltantes.length > 0) {
    await prisma.cliente.createMany({
      data: faltantes.map((v) => ({ name: v.clientName.trim(), country: v.country ?? "" })),
      skipDuplicates: true,
    });
  }
}

export async function getClientes() {
  const clientes = await prisma.cliente.findMany({ orderBy: { name: "asc" } });
  return clientes.map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    country: c.country,
    email: c.email,
    phone: c.phone,
  }));
}

const dataFieldByStatus = {
  CONFIRMACAO_NEGOCIO: "dataEstufagem",
  ASSINATURA_CONTRATO: "dataEstufagem",
  PROFORMA_INVOICE: "dataEstufagem",
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
  LIBERACAO_CARGA: null,
} as const;

export type ContratoRow = Awaited<ReturnType<typeof getContratosExportacao>>[number];

const despesaFields = [
  "despachante",
  "certificados",
  "freteTerrestre",
  "freteMaritimo",
  "taxasLocaisArmador",
  "fumigacao",
  "embalagens",
  "inspecao",
  "despesasPortuarias",
  "armazem",
  "envioAmostra",
  "marcacaoSacaria",
  "freteEntregaSacaria",
  "envioDocumentacao",
  "telexRelease",
  "legalizacao",
  "financiamentoRts",
  "diariaContainerDetention",
  "despesasRedex",
  "estadiaContainer",
] as const;

export type ConfirmacaoNegocioData = {
  id: string;
  dataConfirmacao: string | null;
  numeroContrato: string | null;
  numeroContratoInterno: string | null;
  corretoraId: string | null;
  corretoraName: string | null;
  clienteId: string | null;
  clienteName: string | null;
  valorUsd: number | null;
  tipoFreteId: string | null;
  tipoFreteNome: string | null;
  tipoEmbalagemId: string | null;
  tipoEmbalagemNome: string | null;
  quantidadeSacas: number | null;
  peneiraId: string | null;
  peneiraNome: string | null;
  padraoId: string | null;
  padraoNome: string | null;
  previsaoEmbarque: string | null;
  destinoCarga: string | null;
  formaPagamentoId: string | null;
  formaPagamentoNome: string | null;
  diferencial: number | null;
  fixacaoTipo: string | null;
  dataFixacao: string | null;
  nivelBolsa: number | null;
  valorDolar: number | null;
};

export async function getTiposFrete() {
  const tipos = await prisma.tipoFrete.findMany({ orderBy: { name: "asc" } });
  return tipos.map((t) => ({ id: t.id, name: t.name }));
}

export async function getTiposEmbalagem() {
  const tipos = await prisma.tipoEmbalagem.findMany({ orderBy: { name: "asc" } });
  return tipos.map((t) => ({ id: t.id, name: t.name }));
}

export async function getFormasPagamento() {
  const formas = await prisma.formaPagamento.findMany({ orderBy: { name: "asc" } });
  return formas.map((f) => ({ id: f.id, name: f.name }));
}

export async function getPeneiras() {
  const peneiras = await prisma.peneira.findMany({ orderBy: { name: "asc" } });
  return peneiras.map((p) => ({ id: p.id, name: p.name }));
}

export async function getPadroesCafe() {
  const padroes = await prisma.padraoCafe.findMany({ orderBy: { name: "asc" } });
  return padroes.map((p) => ({ id: p.id, name: p.name }));
}

export async function getTiposAmostra() {
  const tipos = await prisma.tipoAmostra.findMany({ orderBy: { name: "asc" } });
  return tipos.map((t) => ({ id: t.id, name: t.name }));
}

export async function getTransportadorasAmostra() {
  const transportadoras = await prisma.transportadoraAmostra.findMany({ orderBy: { name: "asc" } });
  return transportadoras.map((t) => ({ id: t.id, name: t.name }));
}

export type EnvioAmostraData = {
  tipoAmostraId: string | null;
  tipoAmostraNome: string | null;
  transportadoraId: string | null;
  transportadoraNome: string | null;
  cteNumero: string | null;
  cteValor: number | null;
  notaFiscalNumero: string | null;
  notaFiscalValor: number | null;
};

// Ficha da etapa "Envio de Amostra de Aprovacao (PSS)", indexada por
// contratoId.
export async function getEnviosAmostra(): Promise<Record<string, EnvioAmostraData>> {
  const rows = await prisma.contratoEnvioAmostra.findMany({
    include: { tipoAmostra: true, transportadora: true },
  });

  return Object.fromEntries(
    rows.map((r) => [
      r.contratoId,
      {
        tipoAmostraId: r.tipoAmostraId,
        tipoAmostraNome: r.tipoAmostra?.name ?? null,
        transportadoraId: r.transportadoraId,
        transportadoraNome: r.transportadora?.name ?? null,
        cteNumero: r.cteNumero,
        cteValor: r.cteValor != null ? Number(r.cteValor) : null,
        notaFiscalNumero: r.notaFiscalNumero,
        notaFiscalValor: r.notaFiscalValor != null ? Number(r.notaFiscalValor) : null,
      },
    ])
  );
}

export type FornecedorMarcacaoSacaria = {
  id: string;
  name: string;
  precos: Record<FaixaCoresMarcacaoValue, number>;
};

// Fornecedores de marcacao de sacaria e a respectiva tabela de preco por
// saca (uma por faixa de cores), usados no cadastro e na etapa Aprovacao
// da Arte de Sacaria.
export async function getFornecedoresMarcacaoSacaria(): Promise<FornecedorMarcacaoSacaria[]> {
  const fornecedores = await prisma.fornecedorMarcacaoSacaria.findMany({
    include: { precos: true },
    orderBy: { name: "asc" },
  });

  return fornecedores.map((f) => {
    const precosPorFaixa = new Map(f.precos.map((p) => [p.faixaCores, Number(p.precoPorSaca)]));
    return {
      id: f.id,
      name: f.name,
      precos: Object.fromEntries(
        faixaCoresOrder.map((faixa) => [faixa, precosPorFaixa.get(faixa) ?? 0])
      ) as Record<FaixaCoresMarcacaoValue, number>,
    };
  });
}

export type MarcacaoSacariaData = {
  fornecedorId: string | null;
  fornecedorNome: string | null;
  faixaCores: FaixaCoresMarcacaoValue | null;
  precoPorSaca: number | null;
  quantidadeSacas: number;
  custoTotal: number;
};

// Ficha da etapa "Aprovacao da Arte de Sacaria", indexada por contratoId -
// fornecedor e faixa de cores escolhidos, com o custo ja calculado
// (preco por saca x quantidade de sacas do contrato).
export async function getFichasMarcacaoSacaria(): Promise<Record<string, MarcacaoSacariaData>> {
  const rows = await prisma.contratoMarcacaoSacaria.findMany({
    include: {
      fornecedor: { include: { precos: true } },
      contrato: { include: { confirmacaoNegocio: true } },
    },
  });

  const result: Record<string, MarcacaoSacariaData> = {};
  for (const r of rows) {
    const quantidadeSacas = r.contrato.confirmacaoNegocio?.quantidadeSacas ?? r.contrato.quantSacas ?? 0;
    const precoPorSaca =
      r.faixaCores != null
        ? (r.fornecedor?.precos.find((p) => p.faixaCores === r.faixaCores)?.precoPorSaca ?? null)
        : null;
    const precoPorSacaNum = precoPorSaca != null ? Number(precoPorSaca) : null;

    result[r.contratoId] = {
      fornecedorId: r.fornecedorId,
      fornecedorNome: r.fornecedor?.name ?? null,
      faixaCores: (r.faixaCores as FaixaCoresMarcacaoValue) ?? null,
      precoPorSaca: precoPorSacaNum,
      quantidadeSacas,
      custoTotal: precoPorSacaNum != null ? Number((precoPorSacaNum * quantidadeSacas).toFixed(2)) : 0,
    };
  }
  return result;
}

export type ItemTabelaTransportadoraData = {
  id: string;
  descricao: string;
  precoPorContainer: number;
};

export type TransportadoraRodoviariaData = {
  id: string;
  name: string;
  itens: ItemTabelaTransportadoraData[];
};

// Transportadoras rodoviarias e a respectiva tabela de preco (rotas, pre
// stacking, kit de forracao etc, por container), usadas no cadastro e na
// etapa Estufagem/Carregamento.
export async function getTransportadorasRodoviarias(): Promise<TransportadoraRodoviariaData[]> {
  const transportadoras = await prisma.transportadoraRodoviaria.findMany({
    include: { itens: { orderBy: { createdAt: "asc" } } },
    orderBy: { name: "asc" },
  });

  return transportadoras.map((t) => ({
    id: t.id,
    name: t.name,
    itens: t.itens.map((i) => ({
      id: i.id,
      descricao: i.descricao,
      precoPorContainer: Number(i.precoPorContainer),
    })),
  }));
}

export type TransporteRodoviarioData = {
  transportadoraId: string | null;
  transportadoraNome: string | null;
  itensSelecionadosIds: string[];
  itensSelecionados: ItemTabelaTransportadoraData[];
  quantidadeContainers: number;
  custoTotal: number;
};

// Ficha da etapa "Estufagem/Carregamento", indexada por contratoId -
// transportadora e itens da tabela dela escolhidos, com o custo ja
// calculado (soma dos itens x quantidade de containers).
export async function getFichasTransporteRodoviario(): Promise<Record<string, TransporteRodoviarioData>> {
  const rows = await prisma.contratoTransporteRodoviario.findMany({
    include: { transportadora: { include: { itens: true } } },
  });

  const result: Record<string, TransporteRodoviarioData> = {};
  for (const r of rows) {
    const itensSelecionados = (r.transportadora?.itens ?? [])
      .filter((i) => r.itensSelecionadosIds.includes(i.id))
      .map((i) => ({ id: i.id, descricao: i.descricao, precoPorContainer: Number(i.precoPorContainer) }));
    const custoTotal = Number(
      (itensSelecionados.reduce((sum, i) => sum + i.precoPorContainer, 0) * r.quantidadeContainers).toFixed(2)
    );

    result[r.contratoId] = {
      transportadoraId: r.transportadoraId,
      transportadoraNome: r.transportadora?.name ?? null,
      itensSelecionadosIds: r.itensSelecionadosIds,
      itensSelecionados,
      quantidadeContainers: r.quantidadeContainers,
      custoTotal,
    };
  }
  return result;
}

export type ContratoAnexoData = {
  id: string;
  etapa: StatusContratoValue;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedAt: string;
};

// Todos os anexos de cada contrato, de qualquer etapa - para que fiquem
// sempre acessiveis independente de em qual etapa da Mesa de Operacao o
// contrato esteja no momento. Indexados por contratoId.
export async function getContratoAnexosPorContrato(): Promise<Record<string, ContratoAnexoData[]>> {
  const rows = await prisma.contratoAnexo.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  const porContrato: Record<string, ContratoAnexoData[]> = {};
  for (const r of rows) {
    const item = {
      id: r.id,
      etapa: r.etapa,
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      fileSize: r.fileSize,
      uploadedAt: r.uploadedAt.toISOString(),
    };
    (porContrato[r.contratoId] ??= []).push(item);
  }
  return porContrato;
}

// Data prevista para concluir uma etapa (ex: previsao de assinatura),
// indexada por contratoId - usada para gerar os alertas de prazo.
export async function getPrevisoesPorEtapa(etapa: StatusContratoValue): Promise<Record<string, string>> {
  const rows = await prisma.contratoEtapaPrevisao.findMany({ where: { etapa } });
  return Object.fromEntries(rows.map((r) => [r.contratoId, toISODate(r.dataPrevisao)]));
}

// Status do contrato na etapa atual (Nao iniciado / Em processo / Finalizado),
// indexado por contratoId - contratos sem linha ainda nao foram tocados
// nessa etapa (Nao iniciado).
export async function getStatusPorEtapa(etapa: StatusContratoValue): Promise<Record<string, EtapaStatusValue>> {
  const rows = await prisma.contratoEtapaConcluida.findMany({ where: { etapa } });
  return Object.fromEntries(rows.map((r) => [r.contratoId, r.status as EtapaStatusValue]));
}

// Status de TODAS as etapas de cada contrato, indexado por contratoId e
// depois por etapa - usado para montar o checklist completo da Mesa de
// Operacao no card do contrato. Etapas sem linha ainda nao foram tocadas
// (Nao iniciado).
export async function getChecklistPorContrato(): Promise<
  Record<string, Partial<Record<StatusContratoValue, EtapaStatusValue>>>
> {
  const rows = await prisma.contratoEtapaConcluida.findMany();
  const porContrato: Record<string, Partial<Record<StatusContratoValue, EtapaStatusValue>>> = {};
  for (const r of rows) {
    (porContrato[r.contratoId] ??= {})[r.etapa as StatusContratoValue] = r.status as EtapaStatusValue;
  }
  return porContrato;
}

// Ficha da etapa "Confirmacao de Negocio", indexada por contratoId - campos
// proprios dessa etapa, independentes dos campos gerais do ContratoExportacao.
export async function getConfirmacoesNegocio(): Promise<Record<string, ConfirmacaoNegocioData>> {
  const rows = await prisma.contratoConfirmacaoNegocio.findMany({
    include: {
      cliente: true,
      corretora: true,
      tipoFrete: true,
      tipoEmbalagem: true,
      formaPagamento: true,
      peneira: true,
      padrao: true,
    },
  });

  return Object.fromEntries(
    rows.map((r) => [
      r.contratoId,
      {
        id: r.id,
        dataConfirmacao: r.dataConfirmacao ? toISODate(r.dataConfirmacao) : null,
        numeroContrato: r.numeroContrato,
        numeroContratoInterno: r.numeroContratoInterno,
        corretoraId: r.corretoraId,
        corretoraName: r.corretora?.name ?? null,
        clienteId: r.clienteId,
        clienteName: r.cliente?.name ?? null,
        valorUsd: r.valorUsd != null ? Number(r.valorUsd) : null,
        tipoFreteId: r.tipoFreteId,
        tipoFreteNome: r.tipoFrete?.name ?? null,
        tipoEmbalagemId: r.tipoEmbalagemId,
        tipoEmbalagemNome: r.tipoEmbalagem?.name ?? null,
        quantidadeSacas: r.quantidadeSacas,
        peneiraId: r.peneiraId,
        peneiraNome: r.peneira?.name ?? null,
        padraoId: r.padraoId,
        padraoNome: r.padrao?.name ?? null,
        previsaoEmbarque: r.previsaoEmbarque ? toISODate(r.previsaoEmbarque) : null,
        destinoCarga: r.destinoCarga,
        formaPagamentoId: r.formaPagamentoId,
        formaPagamentoNome: r.formaPagamento?.name ?? null,
        diferencial: r.diferencial != null ? Number(r.diferencial) : null,
        fixacaoTipo: r.fixacaoTipo,
        dataFixacao: r.dataFixacao ? toISODate(r.dataFixacao) : null,
        nivelBolsa: r.nivelBolsa != null ? Number(r.nivelBolsa) : null,
        valorDolar: r.valorDolar != null ? Number(r.valorDolar) : null,
      },
    ])
  );
}

export type HistoricoEtapaAnterior = {
  etapa: StatusContratoValue;
  previsao: string | null;
};

export type HistoricoAnteriorItem = {
  confirmacaoNegocio: ConfirmacaoNegocioData | null;
  porEtapa: HistoricoEtapaAnterior[];
};

// Resumo do que ja foi preenchido nas etapas anteriores a `etapaAtual`
// (Confirmacao de Negocio e previsoes de cada etapa ja passada), indexado
// por contratoId - usado para expandir o "historico" de um contrato na
// Mesa de Operacao. Anexos nao entram aqui: ficam sempre visiveis, de
// qualquer etapa, em getContratoAnexosPorContrato.
export async function getHistoricoAnteriorPorContrato(
  etapaAtual: StatusContratoValue
): Promise<Record<string, HistoricoAnteriorItem>> {
  const idx = statusOrder.indexOf(etapaAtual);
  const etapasAnteriores = statusOrder.slice(0, idx);
  if (etapasAnteriores.length === 0) return {};

  const [previsoesRows, confirmacoes] = await Promise.all([
    prisma.contratoEtapaPrevisao.findMany({ where: { etapa: { in: etapasAnteriores } } }),
    etapasAnteriores.includes("CONFIRMACAO_NEGOCIO")
      ? getConfirmacoesNegocio()
      : Promise.resolve({} as Record<string, ConfirmacaoNegocioData>),
  ]);

  const result: Record<string, HistoricoAnteriorItem> = {};

  function ensure(contratoId: string) {
    return (result[contratoId] ??= { confirmacaoNegocio: null, porEtapa: [] });
  }

  function etapaEntry(item: HistoricoAnteriorItem, etapa: StatusContratoValue) {
    let entry = item.porEtapa.find((e) => e.etapa === etapa);
    if (!entry) {
      entry = { etapa, previsao: null };
      item.porEtapa.push(entry);
    }
    return entry;
  }

  for (const [contratoId, dados] of Object.entries(confirmacoes)) {
    ensure(contratoId).confirmacaoNegocio = dados;
  }

  for (const r of previsoesRows) {
    const item = ensure(r.contratoId);
    etapaEntry(item, r.etapa).previsao = toISODate(r.dataPrevisao);
  }

  for (const item of Object.values(result)) {
    item.porEtapa.sort((a, b) => statusOrder.indexOf(a.etapa) - statusOrder.indexOf(b.etapa));
  }

  return result;
}

export async function getContratosExportacaoCount() {
  return prisma.contratoExportacao.count();
}

export async function getContratosExportacaoCountByStatus() {
  const rows = await prisma.contratoExportacao.groupBy({
    by: ["status"],
    where: { contratoFinalizado: false },
    _count: true,
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count])) as Record<string, number>;
}

export async function getContratosExportacao() {
  const contratos = await prisma.contratoExportacao.findMany({
    include: {
      cliente: true,
      corretora: true,
      fichaEnvioAmostra: true,
      confirmacaoNegocio: true,
      fichaMarcacaoSacaria: { include: { fornecedor: { include: { precos: true } } } },
      fichaTransporteRodoviario: { include: { transportadora: { include: { itens: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return contratos.map((c) => {
    const dataInicioContrato = c.dataInicioContrato ? toISODate(c.dataInicioContrato) : null;
    const dataEstufagem = c.dataEstufagem ? toISODate(c.dataEstufagem) : null;
    const dataEmbarque = c.dataEmbarque ? toISODate(c.dataEmbarque) : null;
    const dataChegada = c.dataChegada ? toISODate(c.dataChegada) : null;

    const relevantField = dataFieldByStatus[c.status];
    const relevantDate =
      relevantField === "dataEstufagem"
        ? dataEstufagem
        : relevantField === "dataEmbarque"
          ? dataEmbarque
          : relevantField === "dataChegada"
            ? dataChegada
            : null;

    const prazoVencido = relevantDate ? relevantDate < toISODate(new Date()) : false;

    const despesas = Object.fromEntries(
      despesaFields.map((field) => [field, Number(c[field])])
    ) as Record<(typeof despesaFields)[number], number>;

    // Quando o fornecedor e a faixa de cores da marcacao de sacaria ja foram
    // escolhidos (etapa Aprovacao da Arte de Sacaria), o custo passa a ser
    // calculado (preco por saca x quantidade de sacas), substituindo o valor
    // manual de "Marcacao de sacaria".
    const fichaMarcacao = c.fichaMarcacaoSacaria;
    const precoPorSacaMarcacao =
      fichaMarcacao?.faixaCores != null
        ? (fichaMarcacao.fornecedor?.precos.find((p) => p.faixaCores === fichaMarcacao.faixaCores)
            ?.precoPorSaca ?? null)
        : null;
    if (precoPorSacaMarcacao != null) {
      const quantidadeSacas = c.confirmacaoNegocio?.quantidadeSacas ?? c.quantSacas ?? 0;
      despesas.marcacaoSacaria = Number((Number(precoPorSacaMarcacao) * quantidadeSacas).toFixed(2));
    }

    // Quando a transportadora e os itens da tabela dela ja foram escolhidos
    // (etapa Estufagem/Carregamento), o custo passa a ser calculado (soma
    // dos itens x quantidade de containers), substituindo o valor manual de
    // "Transporte terrestre".
    const fichaTransporte = c.fichaTransporteRodoviario;
    if (fichaTransporte && fichaTransporte.itensSelecionadosIds.length > 0) {
      const somaItens = (fichaTransporte.transportadora?.itens ?? [])
        .filter((i) => fichaTransporte.itensSelecionadosIds.includes(i.id))
        .reduce((sum, i) => sum + Number(i.precoPorContainer), 0);
      despesas.freteTerrestre = Number((somaItens * fichaTransporte.quantidadeContainers).toFixed(2));
    }

    // O valor do AWB e o valor da nota fiscal (ficha de Envio de Amostra)
    // compoem o custo total do contrato junto com as demais despesas.
    const valorAwb = c.fichaEnvioAmostra?.cteValor != null ? Number(c.fichaEnvioAmostra.cteValor) : 0;
    const valorNotaFiscalAmostra =
      c.fichaEnvioAmostra?.notaFiscalValor != null ? Number(c.fichaEnvioAmostra.notaFiscalValor) : 0;
    const custoTotalDespesas = Number(
      (
        despesaFields.reduce((sum, field) => sum + despesas[field], 0) +
        valorAwb +
        valorNotaFiscalAmostra
      ).toFixed(2)
    );

    return {
      id: c.id,
      contractNumber: c.contractNumber,
      clienteId: c.clienteId,
      clienteName: c.cliente.name,
      clienteCity: c.cliente.city,
      clienteCountry: c.cliente.country,
      country: c.country || c.cliente.country,
      corretoraId: c.corretoraId,
      corretoraName: c.corretora?.name ?? null,
      valorUsd: Number(c.valorUsd),
      dataInicioContrato,
      dataEstufagem,
      dataEmbarque,
      dataChegada,
      status: c.status,
      prazoVencido,
      contratoFinalizado: c.contratoFinalizado,
      dataFinalizacao: c.dataFinalizacao ? toISODate(c.dataFinalizacao) : null,
      createdAt: c.createdAt.toISOString(),
      despesas,
      valorAwb,
      valorNotaFiscalAmostra,
      custoTotalDespesas,
      quantSacas: c.quantSacas,
      adiantamentoUsd: Number(c.adiantamentoUsd),
      dataAdiantamento: c.dataAdiantamento ? toISODate(c.dataAdiantamento) : null,
      financiadoPelaRts: c.financiadoPelaRts,
      valorFinanciadoRtsUsd: Number(c.valorFinanciadoRtsUsd),
      dataLiberacaoFinanciamentoRts: c.dataLiberacaoFinanciamentoRts
        ? toISODate(c.dataLiberacaoFinanciamentoRts)
        : null,
      previsaoPagamentoCliente: c.previsaoPagamentoCliente ? toISODate(c.previsaoPagamentoCliente) : null,
      saldoAReceberRtsUsd: Number(c.saldoAReceberRtsUsd),
      valorRecebidoRtsUsd: Number(c.valorRecebidoRtsUsd),
      dataRecebimentoRts: c.dataRecebimentoRts ? toISODate(c.dataRecebimentoRts) : null,
      obsRecebimento: c.obsRecebimento,
    };
  });
}

export type PaisExportacao = { country: string; totalContratos: number; valorUsd: number };

export async function getExportacaoPorPais(): Promise<PaisExportacao[]> {
  const contratos = await getContratosExportacao();
  const porPais = new Map<string, PaisExportacao>();

  for (const c of contratos) {
    if (!c.country) continue;
    const atual = porPais.get(c.country) ?? { country: c.country, totalContratos: 0, valorUsd: 0 };
    atual.totalContratos += 1;
    atual.valorUsd += c.valorUsd;
    porPais.set(c.country, atual);
  }

  return Array.from(porPais.values()).sort((a, b) => b.valorUsd - a.valorUsd);
}

export async function getExportDashboard() {
  const contratos = await getContratosExportacao();

  const totalContratos = contratos.length;
  const emAndamento = contratos.filter((c) => !c.contratoFinalizado).length;
  const concluidos = contratos.filter((c) => c.contratoFinalizado).length;
  const vencidos = contratos.filter((c) => c.prazoVencido && !c.contratoFinalizado);
  const prazosVencidos = vencidos.length;

  const hoje = toISODate(new Date());
  const msPerDay = 1000 * 60 * 60 * 24;

  const prazosCriticos = vencidos
    .map((c) => {
      const relevantField = dataFieldByStatus[c.status];
      const relevantDate =
        relevantField === "dataEstufagem"
          ? c.dataEstufagem
          : relevantField === "dataEmbarque"
            ? c.dataEmbarque
            : relevantField === "dataChegada"
              ? c.dataChegada
              : null;
      const diasAtraso = relevantDate
        ? Math.floor((Date.parse(hoje) - Date.parse(relevantDate)) / msPerDay)
        : 0;
      return {
        id: c.id,
        contractNumber: c.contractNumber,
        clienteName: c.clienteName,
        data: relevantDate,
        diasAtraso,
      };
    })
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))
    .slice(0, 8);

  const contratosRecentes = [...contratos]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      clienteName: c.clienteName,
      country: c.country,
      status: c.status,
    }));

  const proximosVencimentos = await getProximosVencimentos(contratos);

  return {
    totalContratos,
    emAndamento,
    concluidos,
    prazosVencidos,
    prazosCriticos,
    contratosRecentes,
    proximosVencimentos,
  };
}

const sideLabels: Record<string, string> = { COMPRA: "Compra", VENDA: "Venda" };

export type ProximoVencimento = Awaited<ReturnType<typeof getProximosVencimentos>>[number];

async function getProximosVencimentos(contratos: ContratoRow[]) {
  const operations = await getHedgeOperations();

  const doContrato = contratos
    .filter((c) => !c.contratoFinalizado && !c.prazoVencido)
    .map((c) => {
      const relevantField = dataFieldByStatus[c.status];
      const vencimento =
        relevantField === "dataEstufagem"
          ? c.dataEstufagem
          : relevantField === "dataEmbarque"
            ? c.dataEmbarque
            : relevantField === "dataChegada"
              ? c.dataChegada
              : null;
      return {
        id: c.id,
        tipo: "Exportacao" as const,
        contrato: c.contractNumber,
        banco: c.corretoraName ?? "-",
        valor: c.valorUsd,
        currency: "USD" as const,
        vencimento,
        status: c.status as string,
      };
    })
    .filter((row): row is typeof row & { vencimento: string } => row.vencimento !== null);

  const daOperacao = operations
    .filter((o) => o.status === "A_LIQUIDAR" && o.saldoUsd !== 0)
    .map((o) => ({
      id: o.id,
      tipo: "Operacao Hedge" as const,
      contrato: `${o.contractType}${o.side ? ` ${sideLabels[o.side] ?? o.side}` : ""}`,
      banco: o.corretoraName,
      valor: o.saldoUsd,
      currency: "USD" as const,
      vencimento: o.vencimento,
      status: o.status as string,
    }));

  return [...doContrato, ...daOperacao]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 8);
}

export async function getHedgeKpis() {
  const operations = await getHedgeOperations();
  const abertas = operations.filter((o) => o.status === "A_LIQUIDAR");

  const notionalAberto = Number(abertas.reduce((sum, o) => sum + Math.abs(o.saldoUsd), 0).toFixed(2));
  const posicaoLiquidaUsd = Number(
    abertas
      .reduce((sum, o) => sum + (o.side === "VENDA" ? -Math.abs(o.saldoUsd) : Math.abs(o.saldoUsd)), 0)
      .toFixed(2)
  );
  const resultadoRealizado = Number(
    operations
      .filter((o) => o.status === "LIQUIDADA")
      .reduce((sum, o) => sum + o.desagioValor, 0)
      .toFixed(2)
  );
  const contratosAbertos = abertas.length;
  const totalContratos = operations.length;

  return {
    notionalAberto,
    posicaoLiquidaUsd,
    resultadoRealizado,
    contratosAbertos,
    totalContratos,
  };
}

export type AlertaPrazoRow = {
  contratoId: string;
  contractNumber: string;
  clienteName: string;
  etapa: StatusContratoValue;
  etapaLabel: string;
  dataPrevisao: string;
  alerta: AlertaPrazo;
};

// Prazos previstos das etapas em que cada contrato esta atualmente (previsoes
// de etapas ja ultrapassadas nao contam mais), ordenados do mais urgente para
// o menos urgente - base da pagina "Alerta de Prazos". Etapas ja marcadas como
// Finalizado no checklist nao geram mais alerta, mesmo que o contrato ainda
// nao tenha avancado para a proxima etapa.
export async function getAlertasPrazos(): Promise<AlertaPrazoRow[]> {
  const [rows, finalizadas] = await Promise.all([
    prisma.contratoEtapaPrevisao.findMany({
      include: { contrato: { include: { cliente: true } } },
    }),
    prisma.contratoEtapaConcluida.findMany({ where: { status: "FINALIZADO" } }),
  ]);
  const finalizadasSet = new Set(finalizadas.map((f) => `${f.contratoId}:${f.etapa}`));

  const alertas: AlertaPrazoRow[] = [];
  for (const r of rows) {
    if (r.contrato.status !== r.etapa) continue;
    if (finalizadasSet.has(`${r.contratoId}:${r.etapa}`)) continue;
    const dataPrevisao = toISODate(r.dataPrevisao);
    const alerta = alertaPrazo(dataPrevisao);
    if (!alerta) continue;
    alertas.push({
      contratoId: r.contratoId,
      contractNumber: r.contrato.contractNumber,
      clienteName: r.contrato.cliente.name,
      etapa: r.etapa as StatusContratoValue,
      etapaLabel: statusLabels[r.etapa as StatusContratoValue],
      dataPrevisao,
      alerta,
    });
  }

  return alertas.sort((a, b) => a.alerta.dias - b.alerta.dias);
}
