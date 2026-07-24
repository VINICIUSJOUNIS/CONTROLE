import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PieChartCard } from "@/components/charts/pie-chart-card";
import { accOperations, banks } from "@/lib/mock-data";
import { formatCompactCurrency, formatMonthLabel, formatPercent } from "@/lib/format";
import { Globe2, TrendingUp, TrendingDown, Scale, Landmark } from "lucide-react";

export default function CambialPage() {
  const totalUsd = accOperations
    .filter((a) => a.currency === "USD")
    .reduce((s, a) => s + a.contractedValueForeign, 0);
  const totalEur = accOperations
    .filter((a) => a.currency === "EUR")
    .reduce((s, a) => s + a.contractedValueForeign, 0);
  const totalBRL = accOperations.reduce((s, a) => s + a.receivedValueBRL, 0);

  const spotAvg = accOperations.reduce((s, a) => s + a.spotRate, 0) / accOperations.length;
  const closingAvg = accOperations.reduce((s, a) => s + a.closingRate, 0) / accOperations.length;
  const spreadAvg = closingAvg - spotAvg;

  const resultados = accOperations.map((a) => (a.closingRate - a.spotRate) * a.contractedValueForeign);
  const ganhoCambial = resultados.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const perdaCambial = Math.abs(resultados.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const resultadoCambial = ganhoCambial - perdaCambial;

  const exposicaoAberta = accOperations
    .filter((a) => a.status === "Em aberto")
    .reduce((s, a) => s + a.contractedValueForeign * a.spotRate, 0);

  const currencyDistribution = [
    { name: "USD", value: totalUsd, color: "#155eef" },
    { name: "EUR", value: totalEur, color: "#12b76a" },
  ];

  const exposureByBank = banks
    .map((b) => ({
      name: b.name,
      exposicao: accOperations
        .filter((a) => a.bankId === b.id && a.status === "Em aberto")
        .reduce((s, a) => s + a.contractedValueForeign * a.spotRate, 0),
    }))
    .filter((b) => b.exposicao > 0);

  const monthlyResult = Array.from({ length: 6 }).map((_, i) => {
    const slice = accOperations.filter((_, idx) => idx % 6 === i);
    const value = slice.reduce((s, a) => s + (a.closingRate - a.spotRate) * a.contractedValueForeign, 0);
    return {
      month: formatMonthLabel(`2026-0${i + 1}`),
      resultado: Math.round(value),
    };
  });

  return (
    <div className="flex flex-col">
      <Topbar
        title="Dashboard Cambial"
        subtitle="Painel exclusivo para operacoes de ACC e exposicao cambial"
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Total contratado USD" value={`US$ ${totalUsd.toLocaleString("pt-BR")}`} icon={Globe2} />
          <KpiCard label="Total contratado EUR" value={`€ ${totalEur.toLocaleString("pt-BR")}`} icon={Globe2} />
          <KpiCard label="Total convertido em reais" value={formatCompactCurrency(totalBRL)} icon={Landmark} />
          <KpiCard label="Exposicao cambial (aberto)" value={formatCompactCurrency(exposicaoAberta)} icon={Scale} />
          <KpiCard label="Taxa Spot media" value={`R$ ${spotAvg.toFixed(4)}`} icon={TrendingDown} />
          <KpiCard label="Taxa de fechamento media" value={`R$ ${closingAvg.toFixed(4)}`} icon={TrendingUp} />
          <KpiCard label="Spread medio" value={formatPercent(spreadAvg * 100, 2)} icon={Scale} />
          <KpiCard
            label="Resultado cambial acumulado"
            value={formatCompactCurrency(resultadoCambial)}
            icon={resultadoCambial >= 0 ? TrendingUp : TrendingDown}
            trendPositive={resultadoCambial >= 0}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BarChartCard
              title="Resultado cambial por periodo"
              data={monthlyResult}
              xKey="month"
              series={[{ key: "resultado", name: "Resultado cambial", color: "#7a5af8" }]}
              valueFormat="currency"
            />
          </div>
          <PieChartCard title="Distribuicao por moeda" data={currencyDistribution} />
        </div>

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
      </div>
    </div>
  );
}
