import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PieChartCard } from "@/components/charts/pie-chart-card";
import { getSales, type SaleRow } from "@/lib/data";
import { countryLabel } from "@/lib/countries";
import { formatCurrency } from "@/lib/format";
import { Users, Globe2, Package, DollarSign } from "lucide-react";

type ClientAgg = {
  kg: number;
  sacas: number;
  valueBRL: number;
  valueUSD: number;
  containers20: number;
  containers40: number;
  country: string | null;
};

function rankClients(rows: SaleRow[]) {
  const map = new Map<string, ClientAgg>();
  for (const s of rows) {
    const cur =
      map.get(s.clientName) ??
      { kg: 0, sacas: 0, valueBRL: 0, valueUSD: 0, containers20: 0, containers40: 0, country: s.country };
    cur.kg += s.quantityKg;
    cur.sacas += s.quantitySacas;
    cur.valueBRL += s.valueBRL;
    cur.valueUSD += s.valueUSD ?? 0;
    cur.containers20 += s.containers20 ?? 0;
    cur.containers40 += s.containers40 ?? 0;
    map.set(s.clientName, cur);
  }
  return [...map.entries()].sort((a, b) => b[1].valueBRL - a[1].valueBRL);
}

export default async function FaturamentoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const allSales = await getSales();
  const years = Array.from(new Set(allSales.map((s) => s.saleDate.slice(0, 4)))).sort();

  const sales = allSales.filter((s) => {
    const month = s.saleDate.slice(0, 7);
    if (from && month < from) return false;
    if (to && month > to) return false;
    return true;
  });

  const internos = sales.filter((s) => s.clientType === "INTERNO");
  const externos = sales.filter((s) => s.clientType === "EXTERNO");

  const clientesInternos = new Set(internos.map((s) => s.clientName));
  const clientesExternos = new Set(externos.map((s) => s.clientName));
  const paises = new Set(externos.map((s) => s.country).filter((c): c is string => Boolean(c)));

  const sacasInterno = internos.reduce((s, v) => s + v.quantitySacas, 0);
  const sacasExterno = externos.reduce((s, v) => s + v.quantitySacas, 0);
  const totalContainers20 = externos.reduce((s, v) => s + (v.containers20 ?? 0), 0);
  const totalContainers40 = externos.reduce((s, v) => s + (v.containers40 ?? 0), 0);

  const totalBRL = sales.reduce((s, v) => s + v.valueBRL, 0);
  const totalBRLInterno = internos.reduce((s, v) => s + v.valueBRL, 0);
  const totalBRLExterno = externos.reduce((s, v) => s + v.valueBRL, 0);

  const topInternos = rankClients(internos).slice(0, 10);
  const topExternos = rankClients(externos).slice(0, 10);

  const porMes = new Map<string, { interno: number; externo: number }>();
  for (const s of sales) {
    const month = s.saleDate.slice(0, 7);
    const cur = porMes.get(month) ?? { interno: 0, externo: 0 };
    if (s.clientType === "INTERNO") cur.interno += s.valueBRL;
    else cur.externo += s.valueBRL;
    porMes.set(month, cur);
  }
  const chartMensal = [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, ...v }));

  const pieMercado = [
    { name: "Mercado Interno", value: totalBRLInterno, color: "#8b5a2b" },
    { name: "Mercado Externo", value: totalBRLExterno, color: "#4c9a6a" },
  ];

  return (
    <div className="flex flex-col">
      <Topbar title="Faturamento" subtitle="Visão geral de vendas, clientes e exportação" />
      <div className="space-y-6 p-6">
        <PeriodFilter years={years} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Total Faturado (R$)" value={formatCurrency(totalBRL)} icon={DollarSign} />
          <KpiCard label="Sacas — Mercado Interno" value={sacasInterno.toLocaleString("pt-BR")} icon={Package} />
          <KpiCard label="Sacas — Mercado Externo" value={sacasExterno.toLocaleString("pt-BR")} icon={Package} />
          <KpiCard label="Contêineres 20 pés" value={totalContainers20.toLocaleString("pt-BR")} icon={Package} />
          <KpiCard label="Contêineres 40 pés" value={totalContainers40.toLocaleString("pt-BR")} icon={Package} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Clientes Internos" value={String(clientesInternos.size)} icon={Users} />
          <KpiCard label="Clientes Externos" value={String(clientesExternos.size)} icon={Users} />
          <KpiCard label="Países Exportados" value={String(paises.size)} icon={Globe2} />
        </div>

        {chartMensal.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <BarChartCard
              title="Faturamento por Mês"
              data={chartMensal}
              xKey="month"
              series={[
                { key: "interno", name: "Interno", color: "#8b5a2b" },
                { key: "externo", name: "Externo", color: "#4c9a6a" },
              ]}
              valueFormat="currency"
            />
            <PieChartCard title="Faturamento por Mercado" data={pieMercado} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Maiores Clientes — Mercado Interno</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">Sacas</th>
                    <th className="px-4 py-2.5 font-medium">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {topInternos.map(([name, agg]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium">{name}</td>
                      <td className="px-4 py-2.5">{agg.sacas.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2.5">{formatCurrency(agg.valueBRL)}</td>
                    </tr>
                  ))}
                  {topInternos.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted">
                        Nenhuma venda interna registrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maiores Clientes — Mercado Externo</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">País</th>
                    <th className="px-4 py-2.5 font-medium">Sacas</th>
                    <th className="px-4 py-2.5 font-medium">Cnt 20'</th>
                    <th className="px-4 py-2.5 font-medium">Cnt 40'</th>
                    <th className="px-4 py-2.5 font-medium">Valor (R$)</th>
                    <th className="px-4 py-2.5 font-medium">Valor (US$)</th>
                  </tr>
                </thead>
                <tbody>
                  {topExternos.map(([name, agg]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium">{name}</td>
                      <td className="px-4 py-2.5">{countryLabel(agg.country)}</td>
                      <td className="px-4 py-2.5">{agg.sacas.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2.5">{agg.containers20.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2.5">{agg.containers40.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2.5">{formatCurrency(agg.valueBRL)}</td>
                      <td className="px-4 py-2.5">
                        {agg.valueUSD > 0 ? `US$ ${agg.valueUSD.toLocaleString("pt-BR")}` : "-"}
                      </td>
                    </tr>
                  ))}
                  {topExternos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted">
                        Nenhuma venda externa registrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
