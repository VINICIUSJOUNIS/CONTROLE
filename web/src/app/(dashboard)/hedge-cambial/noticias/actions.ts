"use server";

import { updateTag } from "next/cache";
import { getUltimasNoticias, NOTICIAS_TAG } from "@/lib/hedge-cambial/noticias";
import { CAMBIO_TAG, getPainelCambio } from "@/lib/hedge-cambial/cambio-bcb";
import { gerarBoletimIa, roteiroSimples } from "@/lib/hedge-cambial/boletim";

// Descarta o cache das noticias e do painel de cambio do BCB: a proxima
// leitura da tela busca nas fontes na hora.
export async function atualizarNoticias() {
  updateTag(NOTICIAS_TAG);
  updateTag(CAMBIO_TAG);
}

// Texto do boletim falado, escrito pela IA com os mesmos dados da tela.
// Se a IA nao estiver disponivel, devolve o roteiro simples das manchetes.
export async function gerarBoletim(): Promise<{ texto: string; ia: boolean; aviso?: string }> {
  const [{ dolar }, cambio] = await Promise.all([getUltimasNoticias(), getPainelCambio()]);
  try {
    return { texto: await gerarBoletimIa(dolar, cambio), ia: true };
  } catch (e) {
    console.error("Boletim IA:", e);
    return {
      texto: roteiroSimples(dolar, cambio),
      ia: false,
      aviso: "IA indisponivel no momento: lendo as manchetes e a tendencia do Banco Central.",
    };
  }
}
