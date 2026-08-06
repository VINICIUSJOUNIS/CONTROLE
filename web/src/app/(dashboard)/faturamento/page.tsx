import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { PeriodComparison } from "@/components/dashboard/period-comparison";
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

function aggregatePeriod(rows: SaleRow[], from: string, to: string) {
  const inRange = rows.filter((s) => {
    const month = s.saleDate.slice(0, 7);
    return month >= from && month <= to;
  });
  return {
    totalBRL: inRange.reduce((s, v) => s + v.valueBRL, 0),
    sacas: inRange.reduce((s, v) => s + v.quantitySacas, 0),
    containers: inRange.reduce((s, v) => s + (v.containers20 ?? 0) + (v.containers40 ?? 0), 0),
  };
}

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
  searchParams: Promise<{
    from?: string;
    to?: string;
    cmpFromA?: string;
    cmpToA?: string;
    cmpFromB?: string;
    cmpToB?: string;
  }>;
}) {
  const { from, to, cmpFromA, cmpToA, cmpFromB, cmpToB } = await searchParams;
  const allSales = await getSales();
  const years = Array.from(new Set(allSales.map((s) => s.saleDate.slice(0, 4)))).sort();

  const comparison =
    cmpFromA && cmpToA && cmpFromB && cmpToB
      ? {
          a: aggregatePeriod(allSales, cmpFromA, cmpToA),
          b: aggregatePeriod(allSales, cmpFromB, cmpToB),
        }
      : null;

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
  const totalContainers = totalContainers20 + totalContainers40;

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
    { name: "Mercado Interno", value: totalBRLInterno, color: "#74acb3" },
    { name: "Mercado Externo", value: totalBRLExterno, color: "#12b76a" },
  ];

  const pctInterno = totalBRL > 0 ? (totalBRLInterno / totalBRL) * 100 : 0;
  const pctExterno = totalBRL > 0 ? (totalBRLExterno / totalBRL) * 100 : 0;
  const pctFmt = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  // Evolução anual: sempre com todas as vendas (allSales), independente do filtro de
  // período do topo — o objetivo aqui é comparar ano contra ano, não um recorte.
  type YearAgg = {
    totalBRL: number;
    internoBRL: number;
    externoBRL: number;
    sacas: number;
    containers: number;
  };
  const porAno = new Map<string, YearAgg>();
  for (const s of allSales) {
    const year = s.saleDate.slice(0, 4);
    const cur = porAno.get(year) ?? { totalBRL: 0, internoBRL: 0, externoBRL: 0, sacas: 0, containers: 0 };
    cur.totalBRL += s.valueBRL;
    cur.sacas += s.quantitySacas;
    if (s.clientType === "INTERNO") cur.internoBRL += s.valueBRL;
    else {
      cur.externoBRL += s.valueBRL;
      cur.containers += (s.containers20 ?? 0) + (s.containers40 ?? 0);
    }
    porAno.set(year, cur);
  }
  const anos = [...porAno.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const chartAnual = anos.map(([year, v]) => ({ year, interno: v.internoBRL, externo: v.externoBRL }));

  const anosDesc = [...anos].reverse();
  const [ultimoAno, penultimoAno] = anos.slice(-2).reverse();
  const yoyPct =
    penultimoAno && penultimoAno[1].totalBRL > 0
      ? ((ultimoAno[1].totalBRL - penultimoAno[1].totalBRL) / penultimoAno[1].totalBRL) * 100
      : null;

  return (
    <div className="flex flex-col">
      <Topbar title="Faturamento" subtitle="Visão geral de vendas, clientes e exportação" />
      <div className="space-y-6 p-6">
        <PeriodFilter years={years} />

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Comparação de Períodos</h2>
          <PeriodComparison />

          {comparison && (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="px-4 py-2.5 font-medium">Métrica</th>
                      <th className="px-4 py-2.5 font-medium">
                        Período A ({cmpFromA} a {cmpToA})
                      </th>
                      <th className="px-4 py-2.5 font-medium">
                        Período B ({cmpFromB} a {cmpToB})
                      </th>
                      <th className="px-4 py-2.5 font-medium">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Faturamento (R$)",
                        a: comparison.a.totalBRL,
                        b: comparison.b.totalBRL,
                        format: formatCurrency,
                      },
                      {
                        label: "Sacas (60kg)",
                        a: comparison.a.sacas,
                        b: comparison.b.sacas,
                        format: (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }),
                      },
                      {
                        label: "Contêineres",
                        a: comparison.a.containers,
                        b: comparison.b.containers,
                        format: (v: number) => v.toLocaleString("pt-BR"),
                      },
                    ].map((row) => {
                      const delta = row.b !== 0 ? ((row.a - row.b) / row.b) * 100 : null;
                      return (
                        <tr key={row.label} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 font-medium">{row.label}</td>
                          <td className="px-4 py-2.5">{row.format(row.a)}</td>
                          <td className="px-4 py-2.5">{row.format(row.b)}</td>
                          <td className="px-4 py-2.5">
                            {delta === null ? (
                              <span className="text-muted">-</span>
                            ) : (
                              <span className={delta >= 0 ? "text-success" : "text-danger"}>
                                {delta >= 0 ? "+" : ""}
                                {pctFmt(delta)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Total Faturado (R$)" value={formatCurrency(totalBRL)} icon={DollarSign} tone="teal" />
          <KpiCard
            label="Sacas — Mercado Interno"
            value={sacasInterno.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            icon={Package}
            tone="green"
          />
          <KpiCard
            label="Sacas — Mercado Externo"
            value={sacasExterno.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            icon={Package}
            tone="soft"
          />
          <KpiCard
            label="Total de Contêineres"
            value={totalContainers.toLocaleString("pt-BR")}
            icon={Package}
            tone="teal"
          />
          <KpiCard
            label="Contêineres 20 pés"
            value={totalContainers20.toLocaleString("pt-BR")}
            icon={Package}
            tone="green"
          />
          <KpiCard
            label="Contêineres 40 pés"
            value={totalContainers40.toLocaleString("pt-BR")}
            icon={Package}
            tone="soft"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Clientes Internos" value={String(clientesInternos.size)} icon={Users} tone="teal" />
          <KpiCard label="Clientes Externos" value={String(clientesExternos.size)} icon={Users} tone="green" />
          <KpiCard label="Países Exportados" value={String(paises.size)} icon={Globe2} tone="soft" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard label="% Faturamento — Mercado Interno" value={pctFmt(pctInterno)} icon={Package} tone="teal" />
          <KpiCard label="% Faturamento — Mercado Externo" value={pctFmt(pctExterno)} icon={Globe2} tone="green" />
        </div>

        {chartMensal.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <BarChartCard
              title="Faturamento por Mês"
              data={chartMensal}
              xKey="month"
              series={[
                { key: "interno", name: "Interno", color: "#74acb3" },
                { key: "externo", name: "Externo", color: "#12b76a" },
              ]}
              valueFormat="currency"
            />
            <PieChartCard title="Faturamento por Mercado" data={pieMercado} />
          </div>
        )}

        {anos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Evolução Anual</h2>
              {yoyPct !== null && (
                <KpiCard
                  label={`Faturamento ${ultimoAno[0]} vs ${penultimoAno[0]}`}
                  value={formatCurrency(ultimoAno[1].totalBRL)}
                  icon={DollarSign}
                  trend={pctFmt(Math.abs(yoyPct))}
                  trendLabel={`vs ${penultimoAno[0]}`}
                  trendPositive={yoyPct >= 0}
                  tone="teal"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
              <BarChartCard
                title="Faturamento por Ano"
                data={chartAnual}
                xKey="year"
                series={[
                  { key: "interno", name: "Interno", color: "#74acb3" },
                  { key: "externo", name: "Externo", color: "#12b76a" },
                ]}
                valueFormat="currency"
              />

              <Card>
                <CardHeader>
                  <CardTitle>Comparativo por Ano</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full whitespace-nowrap text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted">
                        <th className="px-4 py-2.5 font-medium">Ano</th>
                        <th className="px-4 py-2.5 font-medium">Faturado (R$)</th>
                        <th className="px-4 py-2.5 font-medium">Sacas</th>
                        <th className="px-4 py-2.5 font-medium">vs ano anterior</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anosDesc.map(([year, v], i) => {
                        const anterior = anosDesc[i + 1];
                        const delta =
                          anterior && anterior[1].totalBRL > 0
                            ? ((v.totalBRL - anterior[1].totalBRL) / anterior[1].totalBRL) * 100
                            : null;
                        return (
                          <tr key={year} className="border-b border-border last:border-0">
                            <td className="px-4 py-2.5 font-medium">{year}</td>
                            <td className="px-4 py-2.5">{formatCurrency(v.totalBRL)}</td>
                            <td className="px-4 py-2.5">
                              {v.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                            </td>
                            <td className="px-4 py-2.5">
                              {delta === null ? (
                                <span className="text-muted">-</span>
                              ) : (
                                <span className={delta >= 0 ? "text-success" : "text-danger"}>
                                  {delta >= 0 ? "+" : ""}
                                  {pctFmt(delta)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maiores Clientes — Mercado Interno</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">Sacas</th>
                    <th className="px-4 py-2.5 font-medium">Valor (R$)</th>
                    <th className="px-4 py-2.5 font-medium">% do Interno</th>
                  </tr>
                </thead>
                <tbody>
                  {topInternos.map(([name, agg], i) => (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 align-top text-muted">{i + 1}</td>
                      <td className="px-4 py-2.5 align-top font-medium">{name}</td>
                      <td className="px-4 py-2.5 align-top">
                        {agg.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-2.5 align-top">{formatCurrency(agg.valueBRL)}</td>
                      <td className="px-4 py-2.5 align-top">
                        {pctFmt(totalBRLInterno > 0 ? (agg.valueBRL / totalBRLInterno) * 100 : 0)}
                      </td>
                    </tr>
                  ))}
                  {topInternos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted">
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
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">País</th>
                    <th className="px-4 py-2.5 font-medium">Sacas</th>
                    <th className="px-4 py-2.5 font-medium">Cnt 20'</th>
                    <th className="px-4 py-2.5 font-medium">Cnt 40'</th>
                    <th className="px-4 py-2.5 font-medium">Valor (R$)</th>
                    <th className="px-4 py-2.5 font-medium">Valor (US$)</th>
                    <th className="px-4 py-2.5 font-medium">% do Externo</th>
                  </tr>
                </thead>
                <tbody>
                  {topExternos.map(([name, agg], i) => (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{name}</td>
                      <td className="px-4 py-2.5">{countryLabel(agg.country)}</td>
                      <td className="px-4 py-2.5">
                        {agg.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-2.5">{agg.containers20.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2.5">{agg.containers40.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-2.5">{formatCurrency(agg.valueBRL)}</td>
                      <td className="px-4 py-2.5">
                        {agg.valueUSD > 0 ? `US$ ${agg.valueUSD.toLocaleString("pt-BR")}` : "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        {pctFmt(totalBRLExterno > 0 ? (agg.valueBRL / totalBRLExterno) * 100 : 0)}
                      </td>
                    </tr>
                  ))}
                  {topExternos.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-muted">
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
