"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type HedgeFormInput = {
  corretoraId: string;
  contractType: "NDF" | "TRAVA";
  side: "COMPRA" | "VENDA" | null;
  contractDate: string;
  vencimento: string;
  valorUsd: number;
  liquidacaoParcialUsd: number;
  nivelCompra: number;
  nivelVenda: number;
  desagioValor: number;
  totalReais: number;
  status: "A_LIQUIDAR" | "LIQUIDADA";
  observacao: string;
};

function revalidateAll() {
  revalidatePath("/hedge");
  revalidatePath("/hedge/operacoes-hedge");
}

export async function createHedge(input: HedgeFormInput) {
  await prisma.hedgeOperation.create({
    data: {
      corretoraId: input.corretoraId,
      contractType: input.contractType,
      side: input.side,
      contractDate: parseLocalDate(input.contractDate),
      vencimento: parseLocalDate(input.vencimento),
      valorUsd: input.valorUsd,
      liquidacaoParcialUsd: input.liquidacaoParcialUsd,
      nivelCompra: input.nivelCompra,
      nivelVenda: input.nivelVenda,
      desagioValor: input.desagioValor,
      totalReais: input.totalReais,
      status: input.status,
      observacao: input.observacao || null,
    },
  });

  revalidateAll();
}

export async function updateHedge(id: string, input: HedgeFormInput) {
  await prisma.hedgeOperation.update({
    where: { id },
    data: {
      corretoraId: input.corretoraId,
      contractType: input.contractType,
      side: input.side,
      contractDate: parseLocalDate(input.contractDate),
      vencimento: parseLocalDate(input.vencimento),
      valorUsd: input.valorUsd,
      liquidacaoParcialUsd: input.liquidacaoParcialUsd,
      nivelCompra: input.nivelCompra,
      nivelVenda: input.nivelVenda,
      desagioValor: input.desagioValor,
      totalReais: input.totalReais,
      status: input.status,
      observacao: input.observacao || null,
    },
  });

  revalidateAll();
}

export async function deleteHedge(id: string) {
  await prisma.hedgeOperation.delete({ where: { id } });
  revalidateAll();
}
