"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type SaleReturnFormInput = {
  clientName: string;
  quantityKg: number;
  returnDate: string;
  valueBRL: number;
};

function revalidateAll() {
  revalidatePath("/faturamento");
  revalidatePath("/faturamento/vendas");
  revalidatePath("/faturamento/devolucoes");
  revalidatePath("/");
}

export async function createSaleReturn(input: SaleReturnFormInput) {
  await prisma.saleReturn.create({
    data: {
      clientName: input.clientName,
      quantityKg: input.quantityKg,
      returnDate: parseLocalDate(input.returnDate),
      valueBRL: input.valueBRL,
    },
  });

  revalidateAll();
}

export async function updateSaleReturn(id: string, input: SaleReturnFormInput) {
  await prisma.saleReturn.update({
    where: { id },
    data: {
      clientName: input.clientName,
      quantityKg: input.quantityKg,
      returnDate: parseLocalDate(input.returnDate),
      valueBRL: input.valueBRL,
    },
  });

  revalidateAll();
}

export async function deleteSaleReturn(id: string) {
  await prisma.saleReturn.delete({ where: { id } });
  revalidateAll();
}
