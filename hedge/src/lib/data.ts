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
