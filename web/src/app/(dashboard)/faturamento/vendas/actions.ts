"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type SaleFormInput = {
  clientName: string;
  clientType: "INTERNO" | "EXTERNO";
  quantityKg: number;
  country: string;
  containers20: number | null;
  containers40: number | null;
  saleDate: string;
  valueBRL: number;
  valueUSD: number | null;
  diferencial: number | null;
};

function revalidateAll() {
  revalidatePath("/faturamento");
  revalidatePath("/faturamento/vendas");
  revalidatePath("/faturamento/paises");
  revalidatePath("/");
}

export async function createSale(input: SaleFormInput) {
  await prisma.sale.create({
    data: {
      clientName: input.clientName,
      clientType: input.clientType,
      quantityKg: input.quantityKg,
      country: input.clientType === "EXTERNO" ? input.country || null : null,
      containers20: input.clientType === "EXTERNO" ? input.containers20 : null,
      containers40: input.clientType === "EXTERNO" ? input.containers40 : null,
      saleDate: parseLocalDate(input.saleDate),
      valueBRL: input.valueBRL,
      valueUSD: input.clientType === "EXTERNO" ? input.valueUSD : null,
      diferencial: input.diferencial,
    },
  });

  revalidateAll();
}

export async function updateSale(id: string, input: SaleFormInput) {
  await prisma.sale.update({
    where: { id },
    data: {
      clientName: input.clientName,
      clientType: input.clientType,
      quantityKg: input.quantityKg,
      country: input.clientType === "EXTERNO" ? input.country || null : null,
      containers20: input.clientType === "EXTERNO" ? input.containers20 : null,
      containers40: input.clientType === "EXTERNO" ? input.containers40 : null,
      saleDate: parseLocalDate(input.saleDate),
      valueBRL: input.valueBRL,
      valueUSD: input.clientType === "EXTERNO" ? input.valueUSD : null,
      diferencial: input.diferencial,
    },
  });

  revalidateAll();
}

export async function deleteSale(id: string) {
  await prisma.sale.delete({ where: { id } });
  revalidateAll();
}
