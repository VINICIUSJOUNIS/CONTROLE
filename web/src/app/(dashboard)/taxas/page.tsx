import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { HeatmapTable } from "@/components/charts/heatmap-table";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { formatMonthLabel, formatPercent } from "@/lib/format";
import { getRateHeatmap, getRateHistory, getRateSummary, getYearlyComparison } from "@/lib/data";
import { Percent, TrendingDown, TrendingUp, Gauge } from "lucide-react";

export default async function TaxasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = params.from || params.to ? { from: params.from, to: params.to } : undefined;

  const [rateHistory, heatmap, yearlyComparison, summary] = await Promise.all([
    getRateHistory(range),
    getRateHeatmap(),
    getYearlyComparison(),
    getRateSummary(range),
  ]);
  const years = yearlyComparison.map((y) => y.year);

  const chartData = rateHistory.map((r) => ({
    month: formatMonthLabel(r.month),
    loanAvgRate: r.loanAvgRate,
    accAvgRate: r.accAvgRate,
    ptax: r.ptax,
    spotAvg: r.spotAvg,
    closingAvg: r.closingAvg,
    cambialSpread: r.cambialSpread,
    financialCost: r.financialCost,
  }));

  const withLoanRate = rateHistory.filter((r) => r.loanAvgRate > 0);
  const withAccRate = rateHistory.filter((r) => r.accAvgRate > 0);
  const first = withLoanRate[0] ?? rateHistory[0];
  const last = withLoanRate[withLoanRate.length - 1] ?? rateHistory[rateHistory.length - 1];
  const firstAcc = withAccRate[0] ?? rateHistory[0];
  const lastAcc = withAccRate[withAccRate.length - 1] ?? rateHistory[rateHistory.length - 1];

  const insights = [
    `A taxa media dos ACC ${lastAcc.accAvgRate < firstAcc.accAvgRate ? "caiu" : "subiu"} de ${formatPercent(
      firstAcc.accAvgRate
    )} (primeiro mes com contrato no periodo) para ${formatPercent(
      lastAcc.accAvgRate
    )} (ultimo mes com contrato).`,
    `A taxa media dos emprestimos ${
      last.loanAvgRate < first.loanAvgRate ? "reduziu" : "aumentou"
    } de ${formatPercent(first.loanAvgRate)} para ${formatPercent(last.loanAvgRate)} no periodo analisado.`,
    `O spread cambial medio esta em ${formatPercent(lastAcc.cambialSpread, 3)}.`,
    `As operacoes mais recentes apresentam custo financeiro estimado de ${formatPercent(
      lastAcc.financialCost
    )}.`,
  ];

  return (
    <div className="flex flex-col">
      <Topbar
        title="Evolucao das Taxas"
        subtitle="Acompanhamento das taxas praticadas ao longo do tempo e identificacao de tendencias"
      />
      <div className="space-y-6 p-6">
        <PeriodFilter years={years} />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Taxa media emprestimos"
            value={formatPercent(summary.loanAvgRate)}
            icon={Percent}
          />
          <KpiCard
            label="Taxa media ACC"
            value={formatPercent(summary.accAvgRate)}
            icon={Percent}
          />
          <KpiCard
            label="Menor taxa contratada"
            value={formatPercent(summary.minRate)}
            icon={TrendingDown}
          />
          <KpiCard
            label="Maior taxa contratada"
            value={formatPercent(summary.maxRate)}
            icon={TrendingUp}
          />
        </div>

        <LineChartCard
          title="Evolucao das taxas - Emprestimos x ACC"
          data={chartData}
          xKey="month"
          series={[
            { key: "loanAvgRate", name: "Emprestimos (%)", color: "#1c8388" },
            { key: "accAvgRate", name: "ACC (%)", color: "#12b76a" },
          ]}
          valueFormat="percent"
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <LineChartCard
            title="Taxa Spot x Taxa de Fechamento"
            data={chartData}
            xKey="month"
            series={[
              { key: "spotAvg", name: "Spot", color: "#f79009" },
              { key: "closingAvg", name: "Fechamento", color: "#f04438" },
            ]}
            valueFormat="rate"
          />
          <LineChartCard
            title="Evolucao do spread cambial e custo financeiro"
            data={chartData}
            xKey="month"
            series={[
              { key: "cambialSpread", name: "Spread cambial", color: "#7a5af8" },
              { key: "financialCost", name: "Custo financeiro (%)", color: "#101828" },
            ]}
          />
        </div>

        <LineChartCard
          title="Evolucao da PTAX"
          data={chartData}
          xKey="month"
          series={[{ key: "ptax", name: "PTAX", color: "#1c8388" }]}
          valueFormat="rate"
          height={220}
        />

        {yearlyComparison.length > 1 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Comparativo de taxas entre anos"
              data={yearlyComparison}
              xKey="year"
              series={[
                { key: "loanAvgRate", name: "Emprestimos (%)", color: "#1c8388" },
                { key: "accAvgRate", name: "ACC (%)", color: "#12b76a" },
              ]}
              valueFormat="percent"
            />
            <BarChartCard
              title="Custo medio da carteira por ano"
              data={yearlyComparison}
              xKey="year"
              series={[{ key: "custoMedio", name: "Custo medio (%)", color: "#f04438" }]}
              valueFormat="percent"
            />
            <BarChartCard
              title="Total captado por ano"
              data={yearlyComparison}
              xKey="year"
              series={[{ key: "totalCaptado", name: "Total captado", color: "#7a5af8" }]}
              valueFormat="currency"
            />
            <BarChartCard
              title="Quantidade de operacoes por ano"
              data={yearlyComparison}
              xKey="year"
              series={[{ key: "qtdOperacoes", name: "Operacoes", color: "#f79009" }]}
            />
          </div>
        )}

        {heatmap.rows.length > 0 && (
          <HeatmapTable
            title="Heatmap das taxas por banco e periodo"
            rowLabel="Banco"
            rows={heatmap.rows}
            columns={heatmap.quarters}
          />
        )}

        <InsightsCard title="Insights automaticos" insights={insights} />

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
          <Gauge size={16} />
          Indicadores calculados a partir dos emprestimos e operacoes de ACC cadastrados no banco de dados.
        </div>
      </div>
    </div>
  );
}
