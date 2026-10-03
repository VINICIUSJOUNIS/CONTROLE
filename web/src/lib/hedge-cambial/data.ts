import { prisma } from "@/lib/prisma";
import { AbaConfig, CADASTROS, Ctx, Dados, Registro } from "@/lib/hedge-cambial/config";

export const PARAMETROS = {
  dolar: "dolar",
  dolarData: "dolarData",
  ny: "ny",
  posicaoB3: "posicaoB3",
} as const;

export type Parametros = {
  dolar: number | null;
  dolarData: string | null;
  ny: number | null;
  posicaoB3: number | null;
};

function hojeLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function getParametros(): Promise<Parametros> {
  const rows = await prisma.hedgeParametro.findMany();
  const map = new Map(rows.map((r) => [r.chave, r.valor]));
  const n = (k: string) => {
    const v = map.get(k);
    if (v === undefined || v === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  return {
    dolar: n(PARAMETROS.dolar),
    dolarData: map.get(PARAMETROS.dolarData) ?? null,
    ny: n(PARAMETROS.ny),
    posicaoB3: n(PARAMETROS.posicaoB3),
  };
}

export function ctxDe(p: Parametros): Ctx {
  return { dolar: p.dolar, ny: p.ny, hoje: hojeLocal() };
}

export async function getRegistros(aba: string): Promise<Registro[]> {
  const rows = await prisma.hedgeRegistro.findMany({ where: { aba }, orderBy: { ordem: "asc" } });
  return rows.map((r) => ({ id: r.id, ordem: r.ordem, dados: r.dados as Dados }));
}

export const abaDoCadastro = (cadastro: keyof typeof CADASTROS) => `cadastro:${cadastro}`;

// Itens de um cadastro (ex.: corretoras da Trava NDF), em ordem alfabetica.
export async function getCadastro(cadastro: keyof typeof CADASTROS): Promise<string[]> {
  const rows = await prisma.hedgeRegistro.findMany({ where: { aba: abaDoCadastro(cadastro) }, select: { dados: true } });
  return rows
    .map((r) => String((r.dados as Dados).nome ?? ""))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// Listas de todos os cadastros usados pelos campos de uma aba.
export async function getCadastrosDaAba(config: AbaConfig): Promise<Record<string, string[]>> {
  const usados = Array.from(new Set(config.campos.map((c) => c.cadastro).filter((c): c is keyof typeof CADASTROS => !!c)));
  const listas = await Promise.all(usados.map((c) => getCadastro(c)));
  return Object.fromEntries(usados.map((c, i) => [c, listas[i]]));
}

export async function getRegistrosPorAba(): Promise<Record<string, Dados[]>> {
  const rows = await prisma.hedgeRegistro.findMany({ select: { aba: true, dados: true }, orderBy: { ordem: "asc" } });
  const out: Record<string, Dados[]> = {};
  for (const r of rows) (out[r.aba] ??= []).push(r.dados as Dados);
  return out;
}
