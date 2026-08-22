"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTransportadoraAmostra(name: string) {
  await prisma.transportadoraAmostra.create({ data: { name } });
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}
