"use server";

import { updateTag } from "next/cache";
import { NOTICIAS_TAG } from "@/lib/hedge-cambial/noticias";

// Descarta o cache das noticias: a proxima leitura da tela busca nas fontes na hora.
export async function atualizarNoticias() {
  updateTag(NOTICIAS_TAG);
}
