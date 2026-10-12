"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function excluirAnaliseCredito(id: string) {
  await prisma.analiseCredito.delete({ where: { id } });
  revalidatePath("/credito");
}
