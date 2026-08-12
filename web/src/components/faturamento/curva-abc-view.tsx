"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { countryLabel } from "@/lib/countries";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Printer } from "lucide-react";
import type { SaleRow } from "@/lib/data";

type ClientAgg = {
  sacas: number;
  valueBRL: number;
  valueUSD: number;
  country: string | null;
};

type ClassifiedClient = {
  name: string;
  agg: ClientAgg;
  pct: number;
  cumulativePct: number;
  classe: "A" | "B" | "C";
};

const classeBadge: Record<ClassifiedClient["classe"], "success" | "warning" | "neutral"> = {
  A: "success",
  B: "warning",
  C: "neutral",
};

// Curva ABC classica: ordena por faturamento decrescente e acumula o % do
// total do segmento (nao so do top 10) - A ate 80% acumulado, B ate 95%,
// C o restante. E o % acumulado que classifica, nao a posicao no ranking.
function classifyAbc(rows: SaleRow[]): { ranked: ClassifiedClient[]; total: number } {
  const map = new Map<string, ClientAgg>();
  for (const s of rows) {
    const cur = map.get(s.clientName) ?? { sacas: 0, valueBRL: 0, valueUSD: 0, country: s.country };
    cur.sacas += s.quantitySacas;
    cur.valueBRL += s.valueBRL;
    cur.valueUSD += s.valueUSD ?? 0;
    map.set(s.clientName, cur);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1].valueBRL - a[1].valueBRL);
  const total = sorted.reduce((sum, [, agg]) => sum + agg.valueBRL, 0);

  let cumulative = 0;
  const ranked = sorted.map(([name, agg]) => {
    const pct = total > 0 ? (agg.valueBRL / total) * 100 : 0;
    cumulative += pct;
    const classe: ClassifiedClient["classe"] = cumulative <= 80 ? "A" : cumulative <= 95 ? "B" : "C";
    return { name, agg, pct, cumulativePct: cumulative, classe };
  });

  return { ranked, total };
}

function ClienteTable({
  title,
  top10,
  total,
  externo,
}: {
  title: string;
  top10: ClassifiedClient[];
  total: number;
  externo: boolean;
}) {
  const somaTop10 = top10.reduce((s, c) => s + c.agg.valueBRL, 0);
  const pctTop10DoTotal = total > 0 ? (somaTop10 / total) * 100 : 0;

  return (
    <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
      <CardHeader>
        <CardTitle className="print:text-xs">{title}</CardTitle>
        <p className="text-xs text-muted print:text-[9px]">
          Os 10 maiores representam {formatPercent(pctTop10DoTotal, 1)} do faturamento total do segmento (
          {formatCurrency(total)}).
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 print:p-0">
        <table className="w-full whitespace-nowrap text-sm print:text-[10px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted print:text-[9px]">
              <th className="px-4 py-2.5 font-medium print:py-1">#</th>
              <th className="px-4 py-2.5 font-medium print:py-1">Cliente</th>
              {externo && <th className="px-4 py-2.5 font-medium print:py-1">País</th>}
              <th className="px-4 py-2.5 font-medium print:py-1">Sacas</th>
              <th className="px-4 py-2.5 font-medium print:py-1">Valor (R$)</th>
              <th className="px-4 py-2.5 font-medium print:py-1">% do Segmento</th>
              <th className="px-4 py-2.5 font-medium print:py-1">% Acumulado</th>
              <th className="px-4 py-2.5 font-medium print:py-1">Classe</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((c, i) => (
              <tr key={c.name} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-muted print:py-0.5">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium print:py-0.5">{c.name}</td>
                {externo && <td className="px-4 py-2.5 print:py-0.5">{countryLabel(c.agg.country)}</td>}
                <td className="px-4 py-2.5 print:py-0.5">
                  {c.agg.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </td>
                <td className={cn("px-4 py-2.5 print:py-0.5", c.agg.valueBRL < 0 && "text-danger")}>
                  {formatCurrency(c.agg.valueBRL)}
                </td>
                <td className="px-4 py-2.5 print:py-0.5">{formatPercent(c.pct, 1)}</td>
                <td className="px-4 py-2.5 print:py-0.5">{formatPercent(c.cumulativePct, 1)}</td>
                <td className="px-4 py-2.5 print:py-0.5">
                  <Badge variant={classeBadge[c.classe]}>{c.classe}</Badge>
                </td>
              </tr>
            ))}
            {top10.length === 0 && (
              <tr>
                <td colSpan={externo ? 8 : 7} className="px-4 py-6 text-center text-muted">
                  Nenhuma venda registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function CurvaAbcView({ internos, externos }: { internos: SaleRow[]; externos: SaleRow[] }) {
  const { ranked: rankedInternos, total: totalInterno } = classifyAbc(internos);
  const { ranked: rankedExternos, total: totalExterno } = classifyAbc(externos);
  const topInternos = rankedInternos.slice(0, 10);
  const topExternos = rankedExternos.slice(0, 10);

  const chartInternos = topInternos.map((c) => ({ cliente: c.name, valor: c.agg.valueBRL }));
  const chartExternos = topExternos.map((c) => ({ cliente: c.name, valor: c.agg.valueBRL }));

  return (
    <div className="relative">
      {/* Marca d'agua da Nayme atras de todo o conteudo da pagina - fixed pra
          repetir em cada folha ao imprimir (nao so na primeira). */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <Image
          src="/nayme-logo.png"
          alt=""
          width={420}
          height={420}
          className="h-[280px] w-[280px] opacity-[0.05] print:h-[200px] print:w-[200px]"
        />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-end print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={14} />
            Imprimir / PDF
          </Button>
        </div>

        <div className="mb-2 hidden items-end justify-between border-b-2 border-primary pb-4 print:flex print:pb-1.5">
          <div className="flex items-center gap-3">
            <Image src="/nayme-logo.png" alt="Nayme" width={48} height={48} className="rounded-full print:h-8 print:w-8" />
            <div>
              <p className="text-lg font-semibold tracking-wide print:text-sm">NAYME</p>
              <p className="text-xs text-muted print:text-[9px]">Tesouraria Corporativa</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold print:text-xs">Curva ABC — 10 Maiores Clientes</p>
            <p className="text-xs text-muted print:text-[9px]">
              Emitido em {formatDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:hidden">
          <BarChartCard
            title="Top 10 Clientes — Mercado Interno"
            data={chartInternos}
            xKey="cliente"
            series={[{ key: "valor", name: "Faturamento", color: "#74acb3" }]}
            valueFormat="currency"
          />
          <BarChartCard
            title="Top 10 Clientes — Mercado Externo"
            data={chartExternos}
            xKey="cliente"
            series={[{ key: "valor", name: "Faturamento", color: "#12b76a" }]}
            valueFormat="currency"
          />
        </div>

        <div className="space-y-4">
          <ClienteTable title="Top 10 — Mercado Interno" top10={topInternos} total={totalInterno} externo={false} />
          <ClienteTable title="Top 10 — Mercado Externo" top10={topExternos} total={totalExterno} externo />
        </div>

        <p className="text-xs text-muted print:text-[8px]">
          Classificação: <span className="font-medium text-success">A</span> = clientes que, somados em ordem
          decrescente de faturamento, respondem por até 80% do total do segmento ·{" "}
          <span className="font-medium text-warning">B</span> = até 95% acumulado ·{" "}
          <span className="font-medium text-muted">C</span> = os 5% finais.
        </p>

        <div className="mt-4 hidden border-t border-border pt-2 text-center text-[10px] text-muted print:block print:pt-1 print:text-[8px]">
          NAYME - Tesouraria Corporativa
        </div>
      </div>
    </div>
  );
}
