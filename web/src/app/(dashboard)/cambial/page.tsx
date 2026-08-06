import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { getAccOperations, getAvailableYears, getBanks, getYearlyComparison } from "@/lib/data";
import { formatCompactCurrency, formatMonthLabel } from "@/lib/format";
import { Globe2, TrendingUp, TrendingDown, Scale, Landmark } from "lucide-react";

export default async function CambialPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = params.from || params.to ? { from: params.from, to: params.to } : undefined;

  const [banks, allAccOperations, yearlyComparison, years] = await Promise.all([
    getBanks(),
    getAccOperations(),
    getYearlyComparison(),
    getAvailableYears(),
  ]);

  const accOperations = allAccOperations.filter((a) => {
    const month = a.contractDate.slice(0, 7);
    if (range?.from && month < range.from) return false;
    if (range?.to && month > range.to) return false;
    return true;
  });

  const totalUsd = accOperations.reduce((s, a) => s + a.contractedValueForeign, 0);
  const totalBRL = accOperations.reduce((s, a) => s + a.receivedValueBRL, 0);

  const count = accOperations.length || 1;
  const spotAvg = accOperations.reduce((s, a) => s + a.spotRate, 0) / count;
  const closingAvg = accOperations.reduce((s, a) => s + a.closingRate, 0) / count;
  const spreadAvg = closingAvg - spotAvg;

  const resultados = accOperations.map((a) => (a.closingRate - a.spotRate) * a.contractedValueForeign);
  const ganhoCambial = resultados.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const perdaCambial = Math.abs(resultados.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const resultadoCambial = ganhoCambial - perdaCambial;

  const exposicaoAberta = accOperations
    .filter((a) => a.status === "EM_ABERTO")
    .reduce((s, a) => s + a.contractedValueForeign * a.spotRate, 0);

  const exposureByBank = banks
    .map((b) => ({
      name: b.name,
      exposicao: accOperations
        .filter((a) => a.bankId === b.id && a.status === "EM_ABERTO")
        .reduce((s, a) => s + a.contractedValueForeign * a.spotRate, 0),
    }))
    .filter((b) => b.exposicao > 0);

  const monthlyResultMap = new Map<string, number>();
  for (const a of accOperations) {
    const month = a.contractDate.slice(0, 7);
    const value = (a.closingRate - a.spotRate) * a.contractedValueForeign;
    monthlyResultMap.set(month, (monthlyResultMap.get(month) ?? 0) + value);
  }
  const monthlyResult = [...monthlyResultMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month: formatMonthLabel(month), resultado: Math.round(value) }));

  return (
    <div className="flex flex-col">
      <Topbar
        title="Dashboard Cambial"
        subtitle="Painel exclusivo para operacoes de ACC e exposicao cambial"
      />
      <div className="space-y-6 p-6">
        <PeriodFilter years={years} />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Total contratado USD"
            value={`US$ ${totalUsd.toLocaleString("pt-BR")}`}
            icon={Globe2}
            tone="teal"
          />
          <KpiCard
            label="Total convertido em reais"
            value={formatCompactCurrency(totalBRL)}
            icon={Landmark}
            tone="green"
          />
          <KpiCard
            label="Exposicao cambial (aberto)"
            value={formatCompactCurrency(exposicaoAberta)}
            icon={Scale}
            tone="soft"
          />
          <KpiCard label="Taxa Spot media" value={`R$ ${spotAvg.toFixed(4)}`} icon={TrendingDown} tone="teal" />
          <KpiCard
            label="Taxa de fechamento media"
            value={`R$ ${closingAvg.toFixed(4)}`}
            icon={TrendingUp}
            tone="green"
          />
          <KpiCard label="Spread medio" value={`R$ ${spreadAvg.toFixed(4)}`} icon={Scale} tone="soft" />
          <KpiCard
            label="Resultado cambial acumulado"
            value={formatCompactCurrency(resultadoCambial)}
            icon={resultadoCambial >= 0 ? TrendingUp : TrendingDown}
            trendPositive={resultadoCambial >= 0}
            tone="teal"
          />
        </div>

        <BarChartCard
          title="Resultado cambial por periodo"
          data={monthlyResult}
          xKey="month"
          series={[{ key: "resultado", name: "Resultado cambial", color: "#7a5af8" }]}
          valueFormat="currency"
        />

        <BarChartCard
          title="Exposicao cambial por banco (operacoes em aberto)"
          data={exposureByBank}
          xKey="name"
          series={[{ key: "exposicao", name: "Exposicao", color: "#f79009" }]}
          valueFormat="currency"
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted">Ganho cambial acumulado</p>
            <p className="mt-1 text-lg font-semibold text-success">{formatCompactCurrency(ganhoCambial)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted">Perda cambial acumulada</p>
            <p className="mt-1 text-lg font-semibold text-danger">{formatCompactCurrency(perdaCambial)}</p>
          </div>
        </div>

        {yearlyComparison.length > 1 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Spot x Fechamento por ano"
              data={yearlyComparison}
              xKey="year"
              series={[
                { key: "spotMedio", name: "Spot", color: "#f79009" },
                { key: "fechamentoMedio", name: "Fechamento", color: "#f04438" },
              ]}
              valueFormat="rate"
            />
            <BarChartCard
              title="Spread cambial medio por ano"
              data={yearlyComparison}
              xKey="year"
              series={[{ key: "spreadMedio", name: "Spread cambial", color: "#7a5af8" }]}
              valueFormat="rate"
            />
          </div>
        )}
      </div>
    </div>
  );
}
