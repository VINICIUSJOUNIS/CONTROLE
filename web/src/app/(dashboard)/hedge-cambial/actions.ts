"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CADASTROS, Dados, getAbaConfig, HEDGE_ABAS, normalizarDados } from "@/lib/hedge-cambial/config";
import { abaDoCadastro, getCadastro, getCadastrosDaAba, PARAMETROS } from "@/lib/hedge-cambial/data";

export type Resultado = { ok: true } | { ok: false; erro: string };

function revalidar(aba?: string) {
  revalidatePath("/hedge-cambial");
  if (aba) revalidatePath(`/hedge-cambial/${aba}`);
}

export async function salvarRegistro(aba: string, id: string | null, entrada: Record<string, unknown>): Promise<Resultado> {
  const config = getAbaConfig(aba);
  if (!config) return { ok: false, erro: "Aba invalida." };
  const atual = id ? await prisma.hedgeRegistro.findUnique({ where: { id } }) : null;
  if (id && (!atual || atual.aba !== aba)) return { ok: false, erro: "Lancamento nao encontrado." };
  const r = normalizarDados(config, entrada, await getCadastrosDaAba(config), atual?.dados as Dados | undefined);
  if ("erro" in r) return { ok: false, erro: r.erro };

  if (id) {
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

// Grava so o dolar do dia (usado na TRAVA NDF), sem mexer nos outros parametros.
export async function salvarDolarDoDia(dolar: number, data: string | null): Promise<Resultado> {
  if (!Number.isFinite(dolar) || dolar <= 0 || dolar > 50) return { ok: false, erro: "Dolar fora da faixa." };
  if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, erro: "Data invalida." };
  await prisma.$transaction([
    prisma.hedgeParametro.upsert({
      where: { chave: PARAMETROS.dolar },
      create: { chave: PARAMETROS.dolar, valor: String(dolar) },
      update: { valor: String(dolar) },
    }),
    prisma.hedgeParametro.upsert({
      where: { chave: PARAMETROS.dolarData },
      create: { chave: PARAMETROS.dolarData, valor: data ?? "" },
      update: { valor: data ?? "" },
    }),
  ]);
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

// ---- Cadastros (ex.: corretoras da Trava NDF) ----
function revalidarCadastro(cadastro: keyof typeof CADASTROS) {
  for (const aba of Object.values(HEDGE_ABAS)) {
    if (aba.campos.some((c) => c.cadastro === cadastro)) revalidar(aba.slug);
  }
}

export async function adicionarItemCadastro(cadastro: string, nome: string): Promise<Resultado> {
  if (!(cadastro in CADASTROS)) return { ok: false, erro: "Cadastro invalido." };
  const c = cadastro as keyof typeof CADASTROS;
  const limpo = nome.replace(/\s+/g, " ").trim().toUpperCase();
  if (!limpo) return { ok: false, erro: "Informe o nome." };
  if (limpo.length > 60) return { ok: false, erro: "Nome muito longo." };
  const existentes = await getCadastro(c);
  if (existentes.some((e) => e.toUpperCase() === limpo)) return { ok: false, erro: `"${limpo}" ja esta cadastrada.` };
  const aba = abaDoCadastro(c);
  const ultimo = await prisma.hedgeRegistro.aggregate({ where: { aba }, _max: { ordem: true } });
  await prisma.hedgeRegistro.create({ data: { aba, ordem: (ultimo._max.ordem ?? 0) + 1, dados: { nome: limpo } } });
  revalidarCadastro(c);
  return { ok: true };
}

// Remove da lista de opcoes. Lancamentos antigos com esse nome continuam como estao.
export async function excluirItemCadastro(cadastro: string, nome: string): Promise<Resultado> {
  if (!(cadastro in CADASTROS)) return { ok: false, erro: "Cadastro invalido." };
  const c = cadastro as keyof typeof CADASTROS;
  await prisma.hedgeRegistro.deleteMany({ where: { aba: abaDoCadastro(c), dados: { path: ["nome"], equals: nome } } });
  revalidarCadastro(c);
  return { ok: true };
}
