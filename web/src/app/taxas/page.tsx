import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { HeatmapTable } from "@/components/charts/heatmap-table";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { formatMonthLabel, formatPercent } from "@/lib/format";
import { heatmapQuarters, rateHeatmap, rateHistory } from "@/lib/mock-data";
import { Percent, TrendingDown, TrendingUp, Gauge } from "lucide-react";

export default function TaxasPage() {
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

  const first = rateHistory[0];
  const last = rateHistory[rateHistory.length - 1];
  const loanRates = rateHistory.map((r) => r.loanAvgRate);
  const accRates = rateHistory.map((r) => r.accAvgRate);

  const insights = [
    `A taxa media dos ACC ${last.accAvgRate < first.accAvgRate ? "caiu" : "subiu"} de ${formatPercent(
      first.accAvgRate
    )} para ${formatPercent(last.accAvgRate)} nos ultimos ${rateHistory.length} meses.`,
    `A taxa media dos emprestimos ${
      last.loanAvgRate < first.loanAvgRate ? "reduziu" : "aumentou"
    } de ${formatPercent(first.loanAvgRate)} para ${formatPercent(last.loanAvgRate)} no periodo analisado.`,
    `O spread cambial medio esta em ${formatPercent(last.cambialSpread, 3)}, ${
      last.cambialSpread > first.cambialSpread ? "acima" : "abaixo"
    } do observado no inicio da serie.`,
    `As operacoes contratadas nos ultimos meses apresentam custo financeiro estimado de ${formatPercent(
      last.financialCost
    )}, o menor patamar da serie historica recente.`,
  ];

  return (
    <div className="flex flex-col">
      <Topbar
        title="Evolucao das Taxas"
        subtitle="Acompanhamento das taxas praticadas ao longo do tempo e identificacao de tendencias"
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            label="Taxa media emprestimos"
            value={formatPercent(last.loanAvgRate)}
            icon={Percent}
          />
          <KpiCard
            label="Taxa media ACC"
            value={formatPercent(last.accAvgRate)}
            icon={Percent}
          />
          <KpiCard
            label="Menor taxa contratada"
            value={formatPercent(Math.min(...loanRates, ...accRates))}
            icon={TrendingDown}
          />
          <KpiCard
            label="Maior taxa contratada"
            value={formatPercent(Math.max(...loanRates, ...accRates))}
            icon={TrendingUp}
          />
        </div>

        <LineChartCard
          title="Evolucao das taxas - Emprestimos x ACC"
          data={chartData}
          xKey="month"
          series={[
            { key: "loanAvgRate", name: "Emprestimos (%)", color: "#155eef" },
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
          series={[{ key: "ptax", name: "PTAX", color: "#155eef" }]}
          valueFormat="rate"
          height={220}
        />

        <HeatmapTable
          title="Heatmap das taxas por banco e periodo"
          rowLabel="Banco"
          rows={rateHeatmap}
          columns={heatmapQuarters}
        />

        <InsightsCard title="Insights automaticos" insights={insights} />

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
          <Gauge size={16} />
          Use os filtros de banco, moeda e periodo (em breve) para comparar operacoes especificas e identificar
          oportunidades de renegociacao.
        </div>
      </div>
    </div>
  );
}
