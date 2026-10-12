import { prisma } from "@/lib/prisma";
import type { Balanco, Dre, DreTipo, Origens } from "./campos";
import type { RegistroCredito } from "./calculos";
import type { Extracao } from "./extracao-schema";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// Todos os meses cadastrados, do mais antigo para o mais recente.
export async function listarRegistrosCredito(): Promise<RegistroCredito[]> {
  const rows = await prisma.analiseCredito.findMany({ orderBy: { competencia: "asc" } });
  return rows.map((r) => ({
    id: r.id,
    competencia: iso(r.competencia)!.slice(0, 7),
    empresa: r.empresa,
    cnpj: r.cnpj,
    dataBalanco: iso(r.dataBalanco)!,
    dataBalancoAnterior: iso(r.dataBalancoAnterior),
    dreTipo: r.dreTipo as DreTipo,
    dreInicio: iso(r.dreInicio),
    dreFim: iso(r.dreFim)!,
    balanco: r.balanco as Balanco,
    balancoAnterior: (r.balancoAnterior as Balanco | null) ?? null,
    dre: r.dre as Dre,
    origens: r.origens as Origens,
    conferenciaPdf: r.conferenciaPdf as RegistroCredito["conferenciaPdf"],
    observacoes: r.observacoes as string[],
    arquivos: r.arquivos,
  }));
}

// Grava (ou substitui) o mes do balanco extraido. A competencia e o mes da data do balanco.
export async function salvarExtracao(e: Extracao, arquivos: string[], modeloIa: string) {
  const competencia = new Date(`${e.dataBalanco.slice(0, 7)}-01T00:00:00Z`);
  const data = {
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
    modeloIa,
  };
  return prisma.analiseCredito.upsert({ where: { competencia }, update: data, create: { competencia, ...data } });
}
