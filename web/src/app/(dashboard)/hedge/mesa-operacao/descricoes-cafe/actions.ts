"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createDescricaoCafe(name: string) {
  await prisma.descricaoCafe.create({ data: { name } });
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}
