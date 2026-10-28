import { Fragment } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatar } from "@/lib/credito/calculos";
import { listarRegistrosCredito } from "@/lib/credito/dados";
import { formatDate } from "@/lib/format";
import {
  colunasMensais,
  colunasTrimestrais,
  linhasDemonstrativo,
  trimestreDe,
  type ColunaComparativo,
  type LinhaDemonstrativo,
} from "@/lib/credito/comparativo";

type Tipo = "balanco" | "dre";
type Visao = "mensal" | "trimestral";

const TEXTOS: Record<Tipo, { titulo: string; subtitulo: string; nota: Record<Visao, string> }> = {
  balanco: {
    titulo: "Balanço",
    subtitulo: "Análise de Crédito - balanço patrimonial conta a conta, mês a mês e por trimestre",
    nota: {
      mensal:
        "Cada mês é o balanço do fim do mês, no plano de contas padronizado da análise (mesmos valores da tela de cada mês). A coluna do trimestre repete a posição do fim do trimestre (último mês incluído). Patrimônio Líquido ajustado: inclui o resultado do período ainda não incorporado ao PL.",
      trimestral:
        "Cada coluna é a posição do fim do trimestre (último mês incluído). Trimestre parcial (em amarelo) mostra a posição do último mês já incluído.",
    },
  },
  dre: {
    titulo: "DRE",
    subtitulo: "Análise de Crédito - demonstração do resultado conta a conta, mês a mês e por trimestre",
    nota: {
      mensal:
        "Cada mês é a DRE do mês isolado (quando o PDF é acumulado, desconta-se o acumulado do mês anterior). A coluna do trimestre é a soma dos meses do trimestre. EBITDA usa a D&A estimada pela variação da depreciação acumulada quando a DRE não a destaca.",
      trimestral:
        "Cada coluna é a soma da DRE isolada dos meses do trimestre. Trimestre parcial (em amarelo) soma só os meses já incluídos.",
    },
  },
};

export async function DemonstrativoPagina({ tipo, ano, visao }: { tipo: Tipo; ano?: string; visao?: string }) {
  const registros = await listarRegistrosCredito();
  const anos = Array.from(new Set(registros.map((r) => r.competencia.slice(0, 4)))).sort();
  const anoSel = ano && anos.includes(ano) ? ano : anos[anos.length - 1];
  const visaoSel: Visao = visao === "trimestral" ? "trimestral" : "mensal";
  const textos = TEXTOS[tipo];

  // Analise usa o historico inteiro (mes anterior, trimestre anterior); o filtro so escolhe as colunas.
  const doAno = (c: ColunaComparativo) => c.chave.startsWith(anoSel ?? "");
  const trimestres = colunasTrimestrais(registros).filter(doAno);
  const meses = colunasMensais(registros).filter(doAno);
  const colunas =
    visaoSel === "trimestral"
      ? trimestres
      : Array.from(new Set(meses.map((m) => trimestreDe(m.chave)))).flatMap((tri) => [
          ...meses.filter((m) => trimestreDe(m.chave) === tri),
          ...trimestres.filter((t) => t.chave === tri),
        ]);

  return (
    <>
      <Topbar title={textos.titulo} subtitle={textos.subtitulo} />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-4">
          {anos.length > 1 && (
            <Seletor opcoes={anos.map((a) => ({ valor: a, rotulo: a, href: `?ano=${a}&visao=${visaoSel}` }))} atual={anoSel} />
          )}
          <Seletor
            opcoes={[
              { valor: "mensal", rotulo: "Mês a mês + trimestre", href: `?ano=${anoSel}&visao=mensal` },
              { valor: "trimestral", rotulo: "Só trimestres", href: `?ano=${anoSel}&visao=trimestral` },
            ]}
            atual={visaoSel}
          />
        </div>
        {colunas.length === 0 ? (
          <p className="text-sm text-muted">Nenhum mês incluído ainda.</p>
        ) : (
          <>
            <p className="text-xs text-muted">{textos.nota[visaoSel]}</p>
            <Tabela tipo={tipo} colunas={colunas} linhas={linhasDemonstrativo(colunas, tipo)} />
          </>
        )}
      </div>
    </>
  );
}

const ehTrimestre = (c: ColunaComparativo) => c.chave.includes("-T");

function Tabela({ tipo, colunas, linhas }: { tipo: Tipo; colunas: ColunaComparativo[]; linhas: LinhaDemonstrativo[] }) {
  const secoes = Array.from(new Set(linhas.map((l) => l.secao)));
  // Balanco: o que importa no cabecalho e a data da posicao; DRE: o periodo somado.
  const detalhe = (c: ColunaComparativo) =>
    tipo === "balanco" ? `posição ${formatDate(c.analise.registro.dataBalanco)}` : ehTrimestre(c) ? `soma ${c.detalhe}` : c.detalhe;

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium">Conta</th>
              {colunas.map((c) => (
                <th key={c.chave} className={cn("px-4 py-3 text-right font-medium", ehTrimestre(c) && "bg-primary/5")}>
                  {c.href ? (
                    <Link href={c.href} className="text-primary hover:underline">
                      {c.rotulo}
                    </Link>
                  ) : (
                    <span className="text-foreground">{c.rotulo}</span>
                  )}
                  <span className={cn("block font-normal", c.parcial && "text-warning")}>
                    {c.parcial && ehTrimestre(c) ? c.detalhe : detalhe(c)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {secoes.map((s) => (
              <Fragment key={s}>
                {secoes.length > 1 && (
                  <tr className="border-b border-border bg-background/40">
                    <td colSpan={colunas.length + 1} className="sticky left-0 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {s}
                    </td>
                  </tr>
                )}
                {linhas
                  .filter((l) => l.secao === s)
                  .map((l) => (
                    <tr
                      key={l.rotulo}
                      className={cn("border-b border-border/50", l.nivel === 0 && "bg-border/30 font-semibold", l.nivel === 1 && "font-semibold")}
                    >
                      <td className={cn("sticky left-0 bg-card px-4 py-1.5", l.nivel === 2 && "pl-8 text-muted")}>{l.rotulo}</td>
                      {l.valores.map((v, i) => (
                        <td
                          key={i}
                          className={cn("px-4 py-1.5 text-right tabular-nums", ehTrimestre(colunas[i]) && "bg-primary/5", (v ?? 0) < 0 && "text-danger")}
                        >
                          {formatar(v, "moeda")}
                        </td>
                      ))}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Seletor({ opcoes, atual }: { opcoes: { valor: string; rotulo: string; href: string }[]; atual?: string }) {
  return (
    <div className="flex gap-2">
      {opcoes.map((o) => (
        <Link
          key={o.valor}
          href={o.href}
          className={cn("rounded-md border px-3 py-1 text-sm", o.valor === atual ? "border-primary text-primary" : "border-border text-muted hover:text-foreground")}
        >
          {o.rotulo}
        </Link>
      ))}
    </div>
  );
}
