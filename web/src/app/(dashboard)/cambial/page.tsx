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

  // Taxas medias ponderadas pelo valor em US$ de cada ACC (taxa media da
  // carteira), nao media simples entre contratos de tamanhos diferentes.
  const spotAvg = totalUsd > 0 ? accOperations.reduce((s, a) => s + a.spotRate * a.contractedValueForeign, 0) / totalUsd : 0;
  const closingAvg = totalUsd > 0 ? accOperations.reduce((s, a) => s + a.closingRate * a.contractedValueForeign, 0) / totalUsd : 0;
  // Spread = spot - fechamento (o banco paga menos que a spot): custo, nunca negativo.
  const spreadAvg = Math.max(0, spotAvg - closingAvg);
  const spreadPct = spotAvg > 0 ? (spreadAvg / spotAvg) * 100 : 0;

  // Custo do spread em R$ (valor contratado x (spot - fechamento)) - antes era
  // exibido como "resultado cambial" com o sinal trocado (perda).
  const custoSpread = accOperations.reduce((s, a) => s + a.spreadValor, 0);

  // Exposicao em aberto: saldo ainda nao liquidado (contratado - baixas), em R$
  // pela taxa de fechamento; inclui ACC em atraso, que continua em aberto.
  const abertos = accOperations.filter((a) => a.status !== "LIQUIDADO");
  const exposicaoAberta = abertos.reduce((s, a) => s + a.saldoAbertoUSD * a.closingRate, 0);

  const exposureByBank = banks
    .map((b) => ({
      name: b.name,
      exposicao: Math.round(abertos.filter((a) => a.bankId === b.id).reduce((s, a) => s + a.saldoAbertoUSD * a.closingRate, 0)),
    }))
    .filter((b) => b.exposicao > 0);

  const custoSpreadPorMes = new Map<string, number>();
  for (const a of accOperations) {
    const month = a.contractDate.slice(0, 7);
    custoSpreadPorMes.set(month, (custoSpreadPorMes.get(month) ?? 0) + a.spreadValor);
  }
  const monthlyResult = [...custoSpreadPorMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month: formatMonthLabel(month), custoSpread: Math.round(value) }));

  return (
    <div className="flex flex-col">
      <Topbar
        title="Dashboard Cambial"
        subtitle="Painel exclusivo para operações de ACC e exposição cambial"
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
            label="Exposição cambial (aberto)"
            value={formatCompactCurrency(exposicaoAberta)}
            icon={Scale}
            tone="soft"
          />
          <KpiCard label="Taxa Spot média (ponderada)" value={`R$ ${spotAvg.toFixed(4)}`} icon={TrendingDown} tone="teal" />
          <KpiCard
            label="Taxa de fechamento média (ponderada)"
            value={`R$ ${closingAvg.toFixed(4)}`}
            icon={TrendingUp}
            tone="green"
          />
          <KpiCard
            label="Spread médio"
            value={`R$ ${spreadAvg.toFixed(4)} (${spreadPct.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}%)`}
            icon={Scale}
            tone="soft"
          />
          <KpiCard
            label="Custo de spread no período"
            value={formatCompactCurrency(custoSpread)}
            icon={TrendingDown}
            tone="teal"
          />
        </div>

        <BarChartCard
          title="Custo de spread por mês de contratação"
          data={monthlyResult}
          xKey="month"
          series={[{ key: "custoSpread", name: "Custo de spread", color: "#7a5af8" }]}
          valueFormat="currency"
        />

        <BarChartCard
          title="Exposição cambial por banco (operações em aberto)"
          data={exposureByBank}
          xKey="name"
          series={[{ key: "exposicao", name: "Exposição", color: "#f79009" }]}
          valueFormat="currency"
        />

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
              title="Spread cambial médio por ano (% da spot)"
              data={yearlyComparison}
              xKey="year"
              series={[{ key: "spreadMedio", name: "Spread cambial (%)", color: "#7a5af8" }]}
              valueFormat="percent"
            />
          </div>
        )}
      </div>
    </div>
  );
}
