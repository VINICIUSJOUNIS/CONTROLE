"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTipoAmostra(name: string) {
  await prisma.tipoAmostra.create({ data: { name } });
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
}
