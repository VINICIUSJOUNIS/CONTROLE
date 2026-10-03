"use server";

import { updateTag } from "next/cache";
import { NOTICIAS_TAG } from "@/lib/hedge-cambial/noticias";
import { CAMBIO_TAG } from "@/lib/hedge-cambial/cambio-bcb";

// Descarta o cache das noticias e do painel de cambio do BCB: a proxima
// leitura da tela busca nas fontes na hora.
export async function atualizarNoticias() {
  updateTag(NOTICIAS_TAG);
  updateTag(CAMBIO_TAG);
}
