"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createFormaPagamento(name: string) {
  await prisma.formaPagamento.create({ data: { name } });
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}
