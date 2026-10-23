"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { removerDocumentos } from "@/lib/credito/documentos";
import { randomUUID } from "crypto";
import { NATUREZAS, type ContaDespesa, type Natureza } from "@/lib/credito/despesas";

// Reclassifica uma conta para todos os meses. natureza null volta para a regra padrao.
export async function reclassificarConta(classificacao: string, natureza: Natureza | null, categoria: string) {
  if (natureza === null) {
    await prisma.classificacaoDespesa.deleteMany({ where: { classificacao } });
  } else {
    if (!NATUREZAS.includes(natureza)) throw new Error("Natureza inválida.");
    await prisma.classificacaoDespesa.upsert({
      where: { classificacao },
      update: { natureza, categoria },
      create: { classificacao, natureza, categoria },
    });
  }
  revalidatePath("/credito/despesas-fixas");
}

export async function excluirBalanceteDespesas(id: string) {
  const { documentos } = await prisma.balanceteDespesas.delete({ where: { id } });
  await removerDocumentos(await createClient(), documentos);
  revalidatePath("/credito/despesas-fixas");
}

// ---------------------------------------------------------------------------
// Edicao de valores e inclusao manual de despesas num mes

async function lerContas(id: string) {
  const r = await prisma.balanceteDespesas.findUniqueOrThrow({ where: { id } });
  return r.contas as ContaDespesa[];
}

async function gravarContas(id: string, contas: ContaDespesa[]) {
  await prisma.balanceteDespesas.update({ where: { id }, data: { contas } });
  revalidatePath("/credito/despesas-fixas");
}

const valido = (v: number) => Number.isFinite(v) && Math.abs(v) < 1e12;

// Corrige o valor do mes e o acumulado ate o mes anterior de uma conta. O valor
// original do PDF fica guardado para restaurar e para a conferencia.
export async function editarValorConta(id: string, classificacao: string, valorMes: number, saldoAnterior: number) {
  if (!valido(valorMes) || !valido(saldoAnterior)) throw new Error("Valor inválido.");
  const contas = await lerContas(id);
  const c = contas.find((x) => x.classificacao === classificacao);
  if (!c) throw new Error("Conta não encontrada.");
  if (!c.manual && !c.original) c.original = { saldoAnterior: c.saldoAnterior, debito: c.debito, credito: c.credito, saldoAtual: c.saldoAtual };
  c.saldoAnterior = arred(saldoAnterior);
  c.debito = arred(Math.max(valorMes, 0));
  c.credito = arred(Math.max(-valorMes, 0));
  c.saldoAtual = arred(saldoAnterior + valorMes);
  await gravarContas(id, contas);
}

export async function restaurarConta(id: string, classificacao: string) {
  const contas = await lerContas(id);
  const c = contas.find((x) => x.classificacao === classificacao);
  if (!c?.original) return;
  Object.assign(c, c.original);
  delete c.original;
  await gravarContas(id, contas);
}

export async function incluirDespesa(
  id: string,
  dados: { descricao: string; categoria: string; natureza: Natureza; valorMes: number; saldoAnterior: number }
) {
  const descricao = dados.descricao.trim().toUpperCase();
  if (!descricao) throw new Error("Informe a descrição.");
  if (!NATUREZAS.includes(dados.natureza)) throw new Error("Natureza inválida.");
  if (!valido(dados.valorMes) || !valido(dados.saldoAnterior)) throw new Error("Valor inválido.");
  const contas = await lerContas(id);
  contas.push({
    codigo: "",
    classificacao: `MANUAL-${randomUUID().slice(0, 8)}`,
    descricao,
    saldoAnterior: arred(dados.saldoAnterior),
    debito: arred(Math.max(dados.valorMes, 0)),
    credito: arred(Math.max(-dados.valorMes, 0)),
    saldoAtual: arred(dados.saldoAnterior + dados.valorMes),
    manual: true,
    natureza: dados.natureza,
    categoria: dados.categoria,
  });
  await gravarContas(id, contas);
}

export async function excluirDespesaManual(id: string, classificacao: string) {
  const contas = await lerContas(id);
  await gravarContas(
    id,
    contas.filter((c) => !(c.manual && c.classificacao === classificacao))
  );
}

const arred = (v: number) => Math.round(v * 100) / 100;
