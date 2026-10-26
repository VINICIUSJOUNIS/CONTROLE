import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatar, type Formato } from "@/lib/credito/calculos";
import type { ColunaComparativo, LinhaComparativo } from "@/lib/credito/comparativo";

// Variacao de um periodo para o seguinte: % para valores em R$; diferenca
// absoluta (p.p., vezes, dias) para indicadores que ja sao razoes. Sem cor:
// subir e bom em receita mas ruim em divida, entao a leitura fica com o usuario.
function variacao(atual: number | null, anterior: number | null, formato: Formato) {
  if (atual === null || anterior === null || !Number.isFinite(atual) || !Number.isFinite(anterior)) return null;
  if (formato === "moeda") {
    if (anterior === 0) return null;
    const v = (atual - anterior) / Math.abs(anterior);
    return { texto: `${v >= 0 ? "+" : ""}${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` };
  }
  const dif = atual - anterior;
  const texto =
    formato === "pct"
      ? `${dif >= 0 ? "+" : ""}${(dif * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} p.p.`
      : `${dif >= 0 ? "+" : ""}${formatar(dif, formato)}`;
  return { texto };
}

export function ComparativoTabela({ colunas, linhas }: { colunas: ColunaComparativo[]; linhas: LinhaComparativo[] }) {
  const grupos = Array.from(new Set(linhas.map((l) => l.grupo)));
  const temVariacao = colunas.length >= 2;
  const ultimo = colunas.length - 1;

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="sticky left-0 bg-card px-4 py-3 text-left font-medium">Conta / Indicador</th>
              {colunas.map((c) => (
                <th key={c.chave} className="px-4 py-3 text-right font-medium">
                  {c.href ? (
                    <Link href={c.href} className="text-primary hover:underline">
                      {c.rotulo}
                    </Link>
                  ) : (
                    <span className="text-foreground">{c.rotulo}</span>
                  )}
                  <span className={cn("block font-normal", c.parcial && "text-warning")}>{c.detalhe}</span>
                </th>
              ))}
              {temVariacao && (
                <th className="px-4 py-3 text-right font-medium">
                  Variação
                  <span className="block font-normal">
                    {colunas[ultimo - 1].rotulo} → {colunas[ultimo].rotulo}
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <GrupoLinhas key={g} grupo={g} linhas={linhas.filter((l) => l.grupo === g)} colunas={colunas.length} temVariacao={temVariacao} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function GrupoLinhas({ grupo, linhas, colunas, temVariacao }: { grupo: string; linhas: LinhaComparativo[]; colunas: number; temVariacao: boolean }) {
  return (
    <>
      <tr className="border-b border-border bg-background/40">
        <td colSpan={colunas + (temVariacao ? 2 : 1)} className="sticky left-0 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {grupo}
        </td>
      </tr>
      {linhas.map((l) => {
        const v = temVariacao ? variacao(l.valores[colunas - 1], l.valores[colunas - 2], l.formato) : null;
        return (
          <tr key={l.rotulo} className="border-b border-border/50 last:border-0">
            <td className={cn("sticky left-0 bg-card px-4 py-2", l.destaque ? "font-semibold" : "text-muted")}>{l.rotulo}</td>
            {l.valores.map((valor, i) => (
              <td key={i} className={cn("px-4 py-2 text-right tabular-nums", l.destaque && "font-semibold", (valor ?? 0) < 0 && l.formato === "moeda" && "text-danger")}>
                {formatar(valor, l.formato)}
              </td>
            ))}
            {temVariacao && (
              <td className="px-4 py-2 text-right tabular-nums text-muted">
                {v?.texto ?? "-"}
              </td>
            )}
          </tr>
        );
      })}
    </>
  );
}
