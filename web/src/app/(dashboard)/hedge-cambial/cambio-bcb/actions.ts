"use server";

import { updateTag } from "next/cache";
import { CAMBIO_TAG } from "@/lib/hedge-cambial/cambio-bcb";

// Descarta o cache do painel: a proxima leitura busca no Banco Central na hora.
export async function atualizarCambio() {
  updateTag(CAMBIO_TAG);
}
