"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { removerDocumentos } from "@/lib/credito/documentos";

export async function excluirAnaliseCredito(id: string) {
  const { documentos } = await prisma.analiseCredito.delete({ where: { id } });
  await removerDocumentos(await createClient(), documentos);
  revalidatePath("/credito", "layout");
}

export async function excluirAnaliseTrimestre(id: string) {
  const { documentos } = await prisma.analiseCreditoTrimestre.delete({ where: { id } });
  await removerDocumentos(await createClient(), documentos);
  revalidatePath("/credito", "layout");
}
