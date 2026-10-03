"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAbaConfig, normalizarDados } from "@/lib/hedge-cambial/config";
import { PARAMETROS } from "@/lib/hedge-cambial/data";

export type Resultado = { ok: true } | { ok: false; erro: string };

function revalidar(aba?: string) {
  revalidatePath("/hedge-cambial");
  if (aba) revalidatePath(`/hedge-cambial/${aba}`);
}

export async function salvarRegistro(aba: string, id: string | null, entrada: Record<string, unknown>): Promise<Resultado> {
  const config = getAbaConfig(aba);
  if (!config) return { ok: false, erro: "Aba invalida." };
  const r = normalizarDados(config, entrada);
  if ("erro" in r) return { ok: false, erro: r.erro };

  if (id) {
    const atual = await prisma.hedgeRegistro.findUnique({ where: { id } });
    if (!atual || atual.aba !== aba) return { ok: false, erro: "Lancamento nao encontrado." };
    await prisma.hedgeRegistro.update({ where: { id }, data: { dados: r.dados } });
  } else {
    const ultimo = await prisma.hedgeRegistro.aggregate({ where: { aba }, _max: { ordem: true } });
    await prisma.hedgeRegistro.create({ data: { aba, ordem: (ultimo._max.ordem ?? 0) + 1, dados: r.dados } });
  }
  revalidar(aba);
  return { ok: true };
}

export async function excluirRegistro(aba: string, id: string): Promise<Resultado> {
  const atual = await prisma.hedgeRegistro.findUnique({ where: { id } });
  if (!atual || atual.aba !== aba) return { ok: false, erro: "Lancamento nao encontrado." };
  await prisma.hedgeRegistro.delete({ where: { id } });
  revalidar(aba);
  return { ok: true };
}

export async function salvarParametros(entrada: {
  dolar: number | null;
  dolarData: string | null;
  ny: number | null;
  posicaoB3: number | null;
}): Promise<Resultado> {
  const pares: [string, number | string | null][] = [
    [PARAMETROS.dolar, entrada.dolar],
    [PARAMETROS.dolarData, entrada.dolarData],
    [PARAMETROS.ny, entrada.ny],
    [PARAMETROS.posicaoB3, entrada.posicaoB3],
  ];
  for (const [chave, v] of pares) {
    if (typeof v === "number" && !Number.isFinite(v)) return { ok: false, erro: "Valor invalido." };
    if (chave === PARAMETROS.dolar && typeof v === "number" && (v <= 0 || v > 50)) return { ok: false, erro: "Dolar fora da faixa." };
  }
  await prisma.$transaction(
    pares.map(([chave, v]) =>
      prisma.hedgeParametro.upsert({
        where: { chave },
        create: { chave, valor: v === null ? "" : String(v) },
        update: { valor: v === null ? "" : String(v) },
      })
    )
  );
  revalidatePath("/hedge-cambial", "layout");
  return { ok: true };
}

// PTAX de venda mais recente publicada pelo Banco Central (ultimos 10 dias,
// para cobrir fins de semana e feriados).
export async function buscarPtax(): Promise<{ ok: true; dolar: number; data: string } | { ok: false; erro: string }> {
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
  const fim = new Date();
  const ini = new Date(fim.getTime() - 10 * 86400000);
  const url =
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
    `?@dataInicial='${fmt(ini)}'&@dataFinalCotacao='${fmt(fim)}'&$format=json&$select=cotacaoVenda,dataHoraCotacao`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false, erro: "Banco Central indisponivel. Informe o dolar manualmente." };
    const json = (await res.json()) as { value?: { cotacaoVenda: number; dataHoraCotacao: string }[] };
    const ultimo = json.value?.at(-1);
    if (!ultimo) return { ok: false, erro: "PTAX nao encontrada. Informe o dolar manualmente." };
    return { ok: true, dolar: ultimo.cotacaoVenda, data: ultimo.dataHoraCotacao.slice(0, 10) };
  } catch {
    return { ok: false, erro: "Falha ao consultar o Banco Central. Informe o dolar manualmente." };
  }
}
