import { prisma } from "@/lib/prisma";
import { Ctx, Dados, Registro } from "@/lib/hedge-cambial/config";

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

export async function getRegistrosPorAba(): Promise<Record<string, Dados[]>> {
  const rows = await prisma.hedgeRegistro.findMany({ select: { aba: true, dados: true }, orderBy: { ordem: "asc" } });
  const out: Record<string, Dados[]> = {};
  for (const r of rows) (out[r.aba] ??= []).push(r.dados as Dados);
  return out;
}
