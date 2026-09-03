import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GerencialFilter } from "@/components/faturamento/gerencial-filter";
import { MonthlyBreakdownSacas } from "@/components/faturamento/monthly-breakdown-sacas";
import { YearComparisonSacas } from "@/components/faturamento/year-comparison-sacas";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { getSales, getSaleReturns } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { MESES_LABEL, matchesPeriod, periodLabel } from "@/lib/gerencial-shared";
import { Package } from "lucide-react";

export default async function ApresentacaoVolumeSacasPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
}) {
  const { year = "", month = "", day = "" } = await searchParams;
  const [allSales, allReturns] = await Promise.all([getSales(), getSaleReturns()]);
  const years = Array.from(new Set(allSales.map((s) => s.saleDate.slice(0, 4)))).sort();

  const sales = allSales.filter((s) => matchesPeriod(s.saleDate, year, month, day));
  const returns = allReturns.filter((r) => matchesPeriod(r.returnDate, year, month, day));

  const internos = sales.filter((s) => s.clientType === "INTERNO");
  const externos = sales.filter((s) => s.clientType === "EXTERNO");
  const returnsInternos = returns.filter((r) => r.clientType === "INTERNO");
  const returnsExternos = returns.filter((r) => r.clientType === "EXTERNO");

  const sacasGeral =
    sales.reduce((s, v) => s + v.quantitySacas, 0) - returns.reduce((s, r) => s + r.quantitySacas, 0);
  const sacasInterno =
    internos.reduce((s, v) => s + v.quantitySacas, 0) - returnsInternos.reduce((s, r) => s + r.quantitySacas, 0);
  const sacasExterno =
    externos.reduce((s, v) => s + v.quantitySacas, 0) - returnsExternos.reduce((s, r) => s + r.quantitySacas, 0);
  const pctInterno = sacasGeral > 0 ? (sacasInterno / sacasGeral) * 100 : 0;
  const pctExterno = sacasGeral > 0 ? (sacasExterno / sacasGeral) * 100 : 0;

  const monthlyRows = year
    ? Array.from({ length: 12 }, (_, i) => {
        const mm = String(i + 1).padStart(2, "0");
        const mSales = allSales.filter((s) => matchesPeriod(s.saleDate, year, mm, ""));
        const mReturns = allReturns.filter((r) => matchesPeriod(r.returnDate, year, mm, ""));
        const mInternos = mSales.filter((s) => s.clientType === "INTERNO");
        const mExternos = mSales.filter((s) => s.clientType === "EXTERNO");
        const mReturnsInternos = mReturns.filter((r) => r.clientType === "INTERNO");
        const mReturnsExternos = mReturns.filter((r) => r.clientType === "EXTERNO");
        const geral =
          mSales.reduce((s, v) => s + v.quantitySacas, 0) - mReturns.reduce((s, r) => s + r.quantitySacas, 0);
        const interno =
          mInternos.reduce((s, v) => s + v.quantitySacas, 0) -
          mReturnsInternos.reduce((s, r) => s + r.quantitySacas, 0);
        const externo =
          mExternos.reduce((s, v) => s + v.quantitySacas, 0) -
          mReturnsExternos.reduce((s, r) => s + r.quantitySacas, 0);
        return {
          label: MESES_LABEL[i],
          geral,
          interno,
          externo,
          pctInterno: geral > 0 ? (interno / geral) * 100 : 0,
          pctExterno: geral > 0 ? (externo / geral) * 100 : 0,
        };
      }).filter((_, i) => {
        const mm = String(i + 1).padStart(2, "0");
        return (
          allSales.some((s) => matchesPeriod(s.saleDate, year, mm, "")) ||
          allReturns.some((r) => matchesPeriod(r.returnDate, year, mm, ""))
        );
      })
    : [];

  function sacasFor(y: string, mm: string) {
    const mSales = allSales.filter((s) => matchesPeriod(s.saleDate, y, mm, ""));
    const mReturns = allReturns.filter((r) => matchesPeriod(r.returnDate, y, mm, ""));
    return mSales.reduce((s, v) => s + v.quantitySacas, 0) - mReturns.reduce((s, r) => s + r.quantitySacas, 0);
  }

  function marketSacasFor(y: string, mm: string, tipo: "INTERNO" | "EXTERNO") {
    const mSales = allSales.filter((s) => s.clientType === tipo && matchesPeriod(s.saleDate, y, mm, ""));
    const mReturns = allReturns.filter((r) => r.clientType === tipo && matchesPeriod(r.returnDate, y, mm, ""));
    return mSales.reduce((s, v) => s + v.quantitySacas, 0) - mReturns.reduce((s, r) => s + r.quantitySacas, 0);
  }

  const YEAR_ANTERIOR = "2025";
  const YEAR_ATUAL = "2026";
  const hoje = new Date();
  const anoAtualCalendario = String(hoje.getFullYear());
  const mesAtualCalendario = hoje.getMonth() + 1;
  const comparisonRows = MESES_LABEL.map((label, i) => {
    const mm = String(i + 1).padStart(2, "0");
    return {
      label,
      mesNum: i + 1,
      geralAnterior: sacasFor(YEAR_ANTERIOR, mm),
      geralAtual: sacasFor(YEAR_ATUAL, mm),
      internoAnterior: marketSacasFor(YEAR_ANTERIOR, mm, "INTERNO"),
      internoAtual: marketSacasFor(YEAR_ATUAL, mm, "INTERNO"),
      externoAnterior: marketSacasFor(YEAR_ANTERIOR, mm, "EXTERNO"),
      externoAtual: marketSacasFor(YEAR_ATUAL, mm, "EXTERNO"),
    };
  }).filter((r) => {
    const mesFuturo = YEAR_ATUAL === anoAtualCalendario && r.mesNum >= mesAtualCalendario;
    if (mesFuturo && r.geralAtual === 0) return false;
    return r.geralAnterior !== 0 || r.geralAtual !== 0;
  });

  const geralAnteriorTotal = sacasFor(YEAR_ANTERIOR, "");
  const geralAtualTotal = sacasFor(YEAR_ATUAL, "");
  const internoAnteriorTotal = marketSacasFor(YEAR_ANTERIOR, "", "INTERNO");
  const internoAtualTotal = marketSacasFor(YEAR_ATUAL, "", "INTERNO");
  const externoAnteriorTotal = marketSacasFor(YEAR_ANTERIOR, "", "EXTERNO");
  const externoAtualTotal = marketSacasFor(YEAR_ATUAL, "", "EXTERNO");

  function pctDelta(anterior: number, atual: number) {
    return anterior !== 0 ? ((atual - anterior) / anterior) * 100 : null;
  }

  const deltaGeral = pctDelta(geralAnteriorTotal, geralAtualTotal);
  const deltaInterno = pctDelta(internoAnteriorTotal, internoAtualTotal);
  const deltaExterno = pctDelta(externoAnteriorTotal, externoAtualTotal);

  return (
    <div className="flex flex-col">
      <Topbar title="Volume de Sacas" />
      <div className="space-y-6 p-6">
        <GerencialFilter years={years} />

        <p className="text-sm text-muted">{periodLabel(year, month, day)}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Volume (Sacas)"
            value={sacasGeral.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            icon={Package}
            tone="teal"
          />
          <KpiCard
            label="Volume — Mercado Interno (Sacas)"
            value={sacasInterno.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            icon={Package}
            tone="green"
          />
          <KpiCard
            label="Volume — Mercado Externo (Sacas)"
            value={sacasExterno.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            icon={Package}
            tone="soft"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard label="% Mercado Interno" value={formatPercent(pctInterno, 1)} icon={Package} tone="green" />
          <KpiCard label="% Mercado Externo" value={formatPercent(pctExterno, 1)} icon={Package} tone="soft" />
        </div>

        <MonthlyBreakdownSacas year={year} rows={monthlyRows} />

        {monthlyRows.length > 0 && (
          <LineChartCard
            title={`Volume por mês — ${year}`}
            data={monthlyRows}
            xKey="label"
            series={[
              { key: "geral", name: "Geral", color: "#1c8388" },
              { key: "interno", name: "Interno", color: "#74acb3" },
              { key: "externo", name: "Externo", color: "#12b76a" },
            ]}
            valueFormat="none"
            lineType="linear"
          />
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Comparativo geral — {YEAR_ANTERIOR} x {YEAR_ATUAL}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label={`Geral ${YEAR_ATUAL}`}
              value={geralAtualTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              icon={Package}
              tone="teal"
              trend={deltaGeral !== null ? formatPercent(Math.abs(deltaGeral), 1) : undefined}
              trendLabel={`vs ${geralAnteriorTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} em ${YEAR_ANTERIOR}`}
              trendPositive={geralAtualTotal >= geralAnteriorTotal}
            />
            <KpiCard
              label={`Interno ${YEAR_ATUAL}`}
              value={internoAtualTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              icon={Package}
              tone="green"
              trend={deltaInterno !== null ? formatPercent(Math.abs(deltaInterno), 1) : undefined}
              trendLabel={`vs ${internoAnteriorTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} em ${YEAR_ANTERIOR}`}
              trendPositive={internoAtualTotal >= internoAnteriorTotal}
            />
            <KpiCard
              label={`Externo ${YEAR_ATUAL}`}
              value={externoAtualTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              icon={Package}
              tone="soft"
              trend={deltaExterno !== null ? formatPercent(Math.abs(deltaExterno), 1) : undefined}
              trendLabel={`vs ${externoAnteriorTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} em ${YEAR_ANTERIOR}`}
              trendPositive={externoAtualTotal >= externoAnteriorTotal}
            />
          </div>
        </div>

        <YearComparisonSacas yearAnterior={YEAR_ANTERIOR} yearAtual={YEAR_ATUAL} rows={comparisonRows} />

        {comparisonRows.length > 0 && (
          <div className="space-y-4">
            <LineChartCard
              title={`Geral — ${YEAR_ANTERIOR} x ${YEAR_ATUAL}`}
              data={comparisonRows}
              xKey="label"
              height={220}
              lineType="linear"
              series={[
                { key: "geralAnterior", name: YEAR_ANTERIOR, color: "#94a3b8" },
                { key: "geralAtual", name: YEAR_ATUAL, color: "#1c8388" },
              ]}
              valueFormat="none"
            />
            <LineChartCard
              title={`Interno — ${YEAR_ANTERIOR} x ${YEAR_ATUAL}`}
              data={comparisonRows}
              xKey="label"
              height={220}
              lineType="linear"
              series={[
                { key: "internoAnterior", name: YEAR_ANTERIOR, color: "#94a3b8" },
                { key: "internoAtual", name: YEAR_ATUAL, color: "#1c8388" },
              ]}
              valueFormat="none"
            />
            <LineChartCard
              title={`Externo — ${YEAR_ANTERIOR} x ${YEAR_ATUAL}`}
              data={comparisonRows}
              xKey="label"
              height={220}
              lineType="linear"
              series={[
                { key: "externoAnterior", name: YEAR_ANTERIOR, color: "#94a3b8" },
                { key: "externoAtual", name: YEAR_ATUAL, color: "#1c8388" },
              ]}
              valueFormat="none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
