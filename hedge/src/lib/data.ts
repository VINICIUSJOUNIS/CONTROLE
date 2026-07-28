import { prisma } from "@/lib/prisma";

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
  CONTRATO_ASSINADO: "dataEstufagem",
  PRE_EMBARQUE: "dataEstufagem",
  ESTUFAGEM_PORTO: "dataEmbarque",
  EMBARCADO: "dataChegada",
  CARGA_DESTINO: "dataChegada",
  CONTRATO_FINALIZADO: null,
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
  const emAndamento = contratos.filter((c) => c.status !== "CONTRATO_FINALIZADO").length;
  const concluidos = contratos.filter((c) => c.status === "CONTRATO_FINALIZADO").length;
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

  return {
    totalContratos,
    emAndamento,
    concluidos,
    prazosVencidos,
    prazosCriticos,
    contratosRecentes,
  };
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
