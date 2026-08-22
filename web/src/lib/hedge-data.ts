import { prisma } from "@/lib/prisma";
import { StatusContratoValue } from "@/app/(dashboard)/hedge/contratos/actions";
import { statusOrder } from "@/lib/contrato-shared";

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
  corretoraId: string | null;
  corretoraName: string | null;
  clienteId: string | null;
  clienteName: string | null;
  valorUsd: number | null;
  frete: string | null;
  tipoEmbalagemId: string | null;
  tipoEmbalagemNome: string | null;
  quantidadeSacas: number | null;
  descricaoCafe: string | null;
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

export async function getTiposEmbalagem() {
  const tipos = await prisma.tipoEmbalagem.findMany({ orderBy: { name: "asc" } });
  return tipos.map((t) => ({ id: t.id, name: t.name }));
}

export async function getFormasPagamento() {
  const formas = await prisma.formaPagamento.findMany({ orderBy: { name: "asc" } });
  return formas.map((f) => ({ id: f.id, name: f.name }));
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
      },
    ])
  );
}

export type ContratoAnexoData = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedAt: string;
};

// Anexos de um contrato numa etapa especifica (contrato assinado, amostra,
// BL, etc), indexados por contratoId.
export async function getContratoAnexosPorEtapa(
  etapa: StatusContratoValue
): Promise<Record<string, ContratoAnexoData[]>> {
  const rows = await prisma.contratoAnexo.findMany({
    where: { etapa },
    orderBy: { uploadedAt: "desc" },
  });

  const porContrato: Record<string, ContratoAnexoData[]> = {};
  for (const r of rows) {
    const item = {
      id: r.id,
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

// Contratos que ja marcaram a etapa como concluida - so esses podem avancar.
export async function getConcluidasPorEtapa(etapa: StatusContratoValue): Promise<Record<string, boolean>> {
  const rows = await prisma.contratoEtapaConcluida.findMany({ where: { etapa } });
  return Object.fromEntries(rows.map((r) => [r.contratoId, true]));
}

// Ficha da etapa "Confirmacao de Negocio", indexada por contratoId - campos
// proprios dessa etapa, independentes dos campos gerais do ContratoExportacao.
export async function getConfirmacoesNegocio(): Promise<Record<string, ConfirmacaoNegocioData>> {
  const rows = await prisma.contratoConfirmacaoNegocio.findMany({
    include: { cliente: true, corretora: true, tipoEmbalagem: true, formaPagamento: true },
  });

  return Object.fromEntries(
    rows.map((r) => [
      r.contratoId,
      {
        id: r.id,
        dataConfirmacao: r.dataConfirmacao ? toISODate(r.dataConfirmacao) : null,
        numeroContrato: r.numeroContrato,
        corretoraId: r.corretoraId,
        corretoraName: r.corretora?.name ?? null,
        clienteId: r.clienteId,
        clienteName: r.cliente?.name ?? null,
        valorUsd: r.valorUsd != null ? Number(r.valorUsd) : null,
        frete: r.frete,
        tipoEmbalagemId: r.tipoEmbalagemId,
        tipoEmbalagemNome: r.tipoEmbalagem?.name ?? null,
        quantidadeSacas: r.quantidadeSacas,
        descricaoCafe: r.descricaoCafe,
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
  anexos: ContratoAnexoData[];
  previsao: string | null;
};

export type HistoricoAnteriorItem = {
  confirmacaoNegocio: ConfirmacaoNegocioData | null;
  porEtapa: HistoricoEtapaAnterior[];
};

// Resumo do que ja foi preenchido nas etapas anteriores a `etapaAtual`
// (Confirmacao de Negocio, anexos e previsoes de cada etapa ja passada),
// indexado por contratoId - usado para expandir o "historico" de um
// contrato na Mesa de Operacao.
export async function getHistoricoAnteriorPorContrato(
  etapaAtual: StatusContratoValue
): Promise<Record<string, HistoricoAnteriorItem>> {
  const idx = statusOrder.indexOf(etapaAtual);
  const etapasAnteriores = statusOrder.slice(0, idx);
  if (etapasAnteriores.length === 0) return {};

  const [anexosRows, previsoesRows, confirmacoes] = await Promise.all([
    prisma.contratoAnexo.findMany({
      where: { etapa: { in: etapasAnteriores } },
      orderBy: { uploadedAt: "desc" },
    }),
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
      entry = { etapa, anexos: [], previsao: null };
      item.porEtapa.push(entry);
    }
    return entry;
  }

  for (const [contratoId, dados] of Object.entries(confirmacoes)) {
    ensure(contratoId).confirmacaoNegocio = dados;
  }

  for (const r of anexosRows) {
    const item = ensure(r.contratoId);
    etapaEntry(item, r.etapa).anexos.push({
      id: r.id,
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      fileSize: r.fileSize,
      uploadedAt: r.uploadedAt.toISOString(),
    });
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
  const rows = await prisma.contratoExportacao.groupBy({ by: ["status"], _count: true });
  return Object.fromEntries(rows.map((r) => [r.status, r._count])) as Record<string, number>;
}

export async function getContratosExportacao() {
  const contratos = await prisma.contratoExportacao.findMany({
    include: { cliente: true, corretora: true },
    orderBy: { createdAt: "desc" },
  });

  return contratos.map((c) => {
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
    const custoTotalDespesas = Number(
      despesaFields.reduce((sum, field) => sum + Number(c[field]), 0).toFixed(2)
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
      dataEstufagem,
      dataEmbarque,
      dataChegada,
      status: c.status,
      prazoVencido,
      createdAt: c.createdAt.toISOString(),
      despesas,
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
  const emAndamento = contratos.filter((c) => c.status !== "LIBERACAO_CARGA").length;
  const concluidos = contratos.filter((c) => c.status === "LIBERACAO_CARGA").length;
  const vencidos = contratos.filter((c) => c.prazoVencido);
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
    .filter((c) => c.status !== "LIBERACAO_CARGA" && !c.prazoVencido)
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
