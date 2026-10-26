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

  // Primeiro e ultimo mes com contrato de cada tipo no periodo (meses sem contrato vem null).
  const comLoan = rateHistory.filter((r) => r.loanAvgRate !== null);
  const comAcc = rateHistory.filter((r) => r.accAvgRate !== null);
  const pct = (v: number | null, d = 2) => (v === null ? "-" : formatPercent(v, d));
  const insights: string[] = [];
  if (comAcc.length >= 2) {
    const [a0, a1] = [comAcc[0].accAvgRate!, comAcc[comAcc.length - 1].accAvgRate!];
    insights.push(`A taxa media ponderada dos ACC ${a1 < a0 ? "caiu" : "subiu"} de ${pct(a0)} (primeiro mes com contrato no periodo) para ${pct(a1)} (ultimo mes com contrato).`);
  }
  if (comLoan.length >= 2) {
    const [l0, l1] = [comLoan[0].loanAvgRate!, comLoan[comLoan.length - 1].loanAvgRate!];
    insights.push(`A taxa media ponderada dos emprestimos ${l1 < l0 ? "reduziu" : "aumentou"} de ${pct(l0)} para ${pct(l1)} no periodo analisado.`);
  }
  const ultimoAcc = comAcc[comAcc.length - 1];
  if (ultimoAcc) {
    insights.push(`Spread cambial medio dos ACC de ${formatMonthLabel(ultimoAcc.month)}: ${pct(ultimoAcc.cambialSpread, 3)} sobre a taxa spot.`);
  }
  const comCusto = rateHistory.filter((r) => r.financialCost !== null);
  const ultimoCusto = comCusto[comCusto.length - 1];
  if (ultimoCusto) {
    insights.push(`Contratos de ${formatMonthLabel(ultimoCusto.month)}: custo total de ${pct(ultimoCusto.financialCost)} sobre o valor captado (prazo inteiro do contrato, nao anualizado).`);
  }

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
            label="Taxa media ponderada emprestimos"
            value={formatPercent(summary.loanAvgRate)}
            icon={Percent}
            tone="teal"
          />
          <KpiCard
            label="Taxa media ponderada ACC"
            value={formatPercent(summary.accAvgRate)}
            icon={Percent}
            tone="green"
          />
          <KpiCard
            label="Menor taxa contratada"
            value={formatPercent(summary.minRate)}
            icon={TrendingDown}
            tone="soft"
          />
          <KpiCard
            label="Maior taxa contratada"
            value={formatPercent(summary.maxRate)}
            icon={TrendingUp}
            tone="teal"
          />
        </div>

        <LineChartCard
          title="Evolucao das taxas (media ponderada) - Emprestimos x ACC"
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
              { key: "financialCost", name: "Custo financeiro (%)", color: "var(--warning)" },
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
