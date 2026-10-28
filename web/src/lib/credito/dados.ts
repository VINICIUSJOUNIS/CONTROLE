import { prisma } from "@/lib/prisma";
import { CAMPOS_BALANCO, CAMPOS_DRE, type Balanco, type Dre, type DreTipo, type Origens } from "./campos";
import type { RegistroCredito } from "./calculos";
import type { Extracao } from "./extracao-schema";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// Registros gravados antes de um campo novo existir recebem 0 nesse campo.
const completar = <T,>(valores: unknown, chaves: readonly { chave: string }[]) =>
  Object.fromEntries(chaves.map((c) => [c.chave, Number((valores as Record<string, unknown>)?.[c.chave] ?? 0)])) as T;

type Linha = Awaited<ReturnType<typeof prisma.analiseCreditoTrimestre.findMany>>[number];

// Campos comuns aos registros do mes e do trimestre. competencia = mes da data do balanco.
const paraRegistro = (r: Omit<Linha, "trimestre">): RegistroCredito => ({
  id: r.id,
  competencia: iso(r.dataBalanco)!.slice(0, 7),
  empresa: r.empresa,
  cnpj: r.cnpj,
  dataBalanco: iso(r.dataBalanco)!,
  dataBalancoAnterior: iso(r.dataBalancoAnterior),
  dreTipo: r.dreTipo as DreTipo,
  dreInicio: iso(r.dreInicio),
  dreFim: iso(r.dreFim)!,
  balanco: completar<Balanco>(r.balanco, CAMPOS_BALANCO),
  balancoAnterior: r.balancoAnterior ? completar<Balanco>(r.balancoAnterior, CAMPOS_BALANCO) : null,
  dre: completar<Dre>(r.dre, CAMPOS_DRE),
  origens: r.origens as Origens,
  conferenciaPdf: r.conferenciaPdf as RegistroCredito["conferenciaPdf"],
  observacoes: r.observacoes as string[],
  arquivos: r.arquivos,
  documentos: r.documentos,
});

// Todos os meses cadastrados, do mais antigo para o mais recente.
export async function listarRegistrosCredito(): Promise<RegistroCredito[]> {
  const rows = await prisma.analiseCredito.findMany({ orderBy: { competencia: "asc" } });
  return rows.map((r) => ({ ...paraRegistro(r), competencia: iso(r.competencia)!.slice(0, 7) }));
}

// Trimestres enviados com PDF proprio (balanco e DRE do trimestre acumulado).
export type RegistroTrimestre = RegistroCredito & { trimestre: string };

export async function listarTrimestresCredito(): Promise<RegistroTrimestre[]> {
  const rows = await prisma.analiseCreditoTrimestre.findMany({ orderBy: { trimestre: "asc" } });
  return rows.map((r) => ({ ...paraRegistro(r), trimestre: r.trimestre }));
}

// Grava (ou substitui) o mes do balanco extraido. A competencia e o mes da data do balanco.
export const competenciaExtracao = (e: Extracao) => e.dataBalanco.slice(0, 7);

// Trimestre do balanco extraido ("AAAA-Tn"); null se a data nao fecha trimestre (mar, jun, set, dez).
export function trimestreExtracao(e: Extracao) {
  const mes = Number(e.dataBalanco.slice(5, 7));
  return mes % 3 === 0 ? `${e.dataBalanco.slice(0, 4)}-T${mes / 3}` : null;
}

const dadosExtracao = (e: Extracao, arquivos: string[], documentos: string[], modeloIa: string) => ({
  empresa: e.empresa,
  cnpj: e.cnpj,
  dataBalanco: new Date(`${e.dataBalanco}T00:00:00Z`),
  dataBalancoAnterior: e.dataBalancoAnterior ? new Date(`${e.dataBalancoAnterior}T00:00:00Z`) : null,
  dreTipo: e.dreTipo,
  dreInicio: e.dreInicio ? new Date(`${e.dreInicio}T00:00:00Z`) : null,
  dreFim: new Date(`${e.dreFim}T00:00:00Z`),
  balanco: e.balanco,
  balancoAnterior: e.balancoAnterior ?? undefined,
  dre: e.dre,
  origens: Object.fromEntries(e.origens.map((o) => [o.campo, o.contas])),
  conferenciaPdf: e.conferenciaPdf,
  observacoes: e.observacoes,
  arquivos,
  documentos,
  modeloIa,
});

export async function salvarExtracao(e: Extracao, arquivos: string[], documentos: string[], modeloIa: string) {
  const competencia = new Date(`${competenciaExtracao(e)}-01T00:00:00Z`);
  const data = dadosExtracao(e, arquivos, documentos, modeloIa);
  return prisma.analiseCredito.upsert({ where: { competencia }, update: data, create: { competencia, ...data } });
}

export async function salvarExtracaoTrimestre(trimestre: string, e: Extracao, arquivos: string[], documentos: string[], modeloIa: string) {
  const data = dadosExtracao(e, arquivos, documentos, modeloIa);
  return prisma.analiseCreditoTrimestre.upsert({ where: { trimestre }, update: data, create: { trimestre, ...data } });
}
