import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { getSales, type SaleRow } from "@/lib/data";
import { countryLabel } from "@/lib/countries";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted">
          Os 10 maiores representam {formatPercent(pctTop10DoTotal, 1)} do faturamento total do segmento (
          {formatCurrency(total)}).
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              {externo && <th className="px-4 py-2.5 font-medium">País</th>}
              <th className="px-4 py-2.5 font-medium">Sacas</th>
              <th className="px-4 py-2.5 font-medium">Valor (R$)</th>
              <th className="px-4 py-2.5 font-medium">% do Segmento</th>
              <th className="px-4 py-2.5 font-medium">% Acumulado</th>
              <th className="px-4 py-2.5 font-medium">Classe</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((c, i) => (
              <tr key={c.name} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium">{c.name}</td>
                {externo && <td className="px-4 py-2.5">{countryLabel(c.agg.country)}</td>}
                <td className="px-4 py-2.5">{c.agg.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                <td className={cn("px-4 py-2.5", c.agg.valueBRL < 0 && "text-danger")}>
                  {formatCurrency(c.agg.valueBRL)}
                </td>
                <td className="px-4 py-2.5">{formatPercent(c.pct, 1)}</td>
                <td className="px-4 py-2.5">{formatPercent(c.cumulativePct, 1)}</td>
                <td className="px-4 py-2.5">
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

export default async function CurvaAbcPage() {
  const allSales = await getSales();
  const internos = allSales.filter((s) => s.clientType === "INTERNO");
  const externos = allSales.filter((s) => s.clientType === "EXTERNO");

  const { ranked: rankedInternos, total: totalInterno } = classifyAbc(internos);
  const { ranked: rankedExternos, total: totalExterno } = classifyAbc(externos);
  const topInternos = rankedInternos.slice(0, 10);
  const topExternos = rankedExternos.slice(0, 10);

  const chartInternos = topInternos.map((c) => ({ cliente: c.name, valor: c.agg.valueBRL }));
  const chartExternos = topExternos.map((c) => ({ cliente: c.name, valor: c.agg.valueBRL }));

  return (
    <div className="flex flex-col">
      <Topbar
        title="Curva ABC"
        subtitle="Classificação ABC dos 10 maiores clientes — mercado interno e externo"
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <p className="text-xs text-muted">
          Classificação: <span className="font-medium text-success">A</span> = clientes que, somados em ordem
          decrescente de faturamento, respondem por até 80% do total do segmento ·{" "}
          <span className="font-medium text-warning">B</span> = até 95% acumulado ·{" "}
          <span className="font-medium text-muted">C</span> = os 5% finais.
        </p>
      </div>
    </div>
  );
}
