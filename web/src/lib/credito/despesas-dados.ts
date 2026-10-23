import { prisma } from "@/lib/prisma";
import type { Ajuste, ContaDespesa, Natureza } from "./despesas";

export type BalanceteDespesasRegistro = {
  id: string;
  competencia: string; // AAAA-MM
  empresa: string;
  cnpj: string;
  contas: ContaDespesa[];
  totalPdf: { saldoAnterior: number; debito: number; credito: number; saldoAtual: number };
  arquivos: string[];
  documentos: string[];
};

export async function listarBalancetesDespesas(): Promise<BalanceteDespesasRegistro[]> {
  const rows = await prisma.balanceteDespesas.findMany({ orderBy: { competencia: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    competencia: r.competencia.toISOString().slice(0, 7),
    empresa: r.empresa,
    cnpj: r.cnpj,
    contas: r.contas as ContaDespesa[],
    totalPdf: r.totalPdf as BalanceteDespesasRegistro["totalPdf"],
    arquivos: r.arquivos,
    documentos: r.documentos,
  }));
}

export async function listarAjustesDespesa(): Promise<Record<string, Ajuste>> {
  const rows = await prisma.classificacaoDespesa.findMany();
  return Object.fromEntries(rows.map((r) => [r.classificacao, { natureza: r.natureza as Natureza, categoria: r.categoria }]));
}
