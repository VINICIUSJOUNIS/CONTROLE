import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GerencialFilter } from "@/components/faturamento/gerencial-filter";
import { MonthlyBreakdown } from "@/components/faturamento/monthly-breakdown";
import { YearComparison } from "@/components/faturamento/year-comparison";
import { getSales, getSaleReturns } from "@/lib/data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { DollarSign, Package } from "lucide-react";

const MESES_LABEL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function matchesPeriod(dateStr: string, year: string, month: string, day: string) {
  if (!year) return true;
  if (dateStr.slice(0, 4) !== year) return false;
  if (!month) return true;
  if (dateStr.slice(5, 7) !== month) return false;
  if (!day) return true;
  return dateStr.slice(8, 10) === day;
}

function periodLabel(year: string, month: string, day: string) {
  if (!year) return "Todos os períodos";
  if (!month) return `Ano de ${year}`;
  const mesLabel = MESES_LABEL[Number(month) - 1];
  if (!day) return `${mesLabel} de ${year}`;
  return `${day}/${month}/${year}`;
}

export default async function FaturamentoGerencialPage({
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

  const totalGeral =
    sales.reduce((s, v) => s + v.valueBRL, 0) - returns.reduce((s, r) => s + r.valueBRL, 0);
  const totalInterno =
    internos.reduce((s, v) => s + v.valueBRL, 0) - returnsInternos.reduce((s, r) => s + r.valueBRL, 0);
  const totalExterno =
    externos.reduce((s, v) => s + v.valueBRL, 0) - returnsExternos.reduce((s, r) => s + r.valueBRL, 0);
  const totalContainers = externos.reduce((s, v) => s + (v.containers20 ?? 0) + (v.containers40 ?? 0), 0);
  const pctInterno = totalGeral > 0 ? (totalInterno / totalGeral) * 100 : 0;
  const pctExterno = totalGeral > 0 ? (totalExterno / totalGeral) * 100 : 0;

  const monthlyRows = year
    ? Array.from({ length: 12 }, (_, i) => {
        const mm = String(i + 1).padStart(2, "0");
        const mSales = allSales.filter((s) => matchesPeriod(s.saleDate, year, mm, ""));
        const mReturns = allReturns.filter((r) => matchesPeriod(r.returnDate, year, mm, ""));
        const mInternos = mSales.filter((s) => s.clientType === "INTERNO");
        const mExternos = mSales.filter((s) => s.clientType === "EXTERNO");
        const mReturnsInternos = mReturns.filter((r) => r.clientType === "INTERNO");
        const mReturnsExternos = mReturns.filter((r) => r.clientType === "EXTERNO");
        const geral = mSales.reduce((s, v) => s + v.valueBRL, 0) - mReturns.reduce((s, r) => s + r.valueBRL, 0);
        const interno =
          mInternos.reduce((s, v) => s + v.valueBRL, 0) - mReturnsInternos.reduce((s, r) => s + r.valueBRL, 0);
        const externo =
          mExternos.reduce((s, v) => s + v.valueBRL, 0) - mReturnsExternos.reduce((s, r) => s + r.valueBRL, 0);
        const containers = mExternos.reduce((s, v) => s + (v.containers20 ?? 0) + (v.containers40 ?? 0), 0);
        return {
          label: MESES_LABEL[i],
          geral,
          interno,
          externo,
          containers,
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

  function geralFor(y: string, mm: string) {
    const mSales = allSales.filter((s) => matchesPeriod(s.saleDate, y, mm, ""));
    const mReturns = allReturns.filter((r) => matchesPeriod(r.returnDate, y, mm, ""));
    return mSales.reduce((s, v) => s + v.valueBRL, 0) - mReturns.reduce((s, r) => s + r.valueBRL, 0);
  }

  function marketFor(y: string, mm: string, tipo: "INTERNO" | "EXTERNO") {
    const mSales = allSales.filter((s) => s.clientType === tipo && matchesPeriod(s.saleDate, y, mm, ""));
    const mReturns = allReturns.filter((r) => r.clientType === tipo && matchesPeriod(r.returnDate, y, mm, ""));
    return mSales.reduce((s, v) => s + v.valueBRL, 0) - mReturns.reduce((s, r) => s + r.valueBRL, 0);
  }

  function containersFor(y: string, mm: string) {
    const mExternos = allSales.filter((s) => s.clientType === "EXTERNO" && matchesPeriod(s.saleDate, y, mm, ""));
    return mExternos.reduce((s, v) => s + (v.containers20 ?? 0) + (v.containers40 ?? 0), 0);
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
      geralAnterior: geralFor(YEAR_ANTERIOR, mm),
      geralAtual: geralFor(YEAR_ATUAL, mm),
      internoAnterior: marketFor(YEAR_ANTERIOR, mm, "INTERNO"),
      internoAtual: marketFor(YEAR_ATUAL, mm, "INTERNO"),
      externoAnterior: marketFor(YEAR_ANTERIOR, mm, "EXTERNO"),
      externoAtual: marketFor(YEAR_ATUAL, mm, "EXTERNO"),
      containersAnterior: containersFor(YEAR_ANTERIOR, mm),
      containersAtual: containersFor(YEAR_ATUAL, mm),
    };
  }).filter((r) => {
    const mesFuturo = YEAR_ATUAL === anoAtualCalendario && r.mesNum >= mesAtualCalendario;
    if (mesFuturo && r.geralAtual === 0) return false;
    return r.geralAnterior !== 0 || r.geralAtual !== 0;
  });

  return (
    <div className="flex flex-col">
      <Topbar title="Faturamento Gerencial" />
      <div className="space-y-6 p-6">
        <GerencialFilter years={years} />

        <p className="text-sm text-muted">{periodLabel(year, month, day)}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Faturamento Geral (R$)" value={formatCurrency(totalGeral)} icon={DollarSign} tone="teal" />
          <KpiCard
            label="Faturamento — Mercado Interno (R$)"
            value={formatCurrency(totalInterno)}
            icon={DollarSign}
            tone="green"
          />
          <KpiCard
            label="Faturamento — Mercado Externo (R$)"
            value={formatCurrency(totalExterno)}
            icon={DollarSign}
            tone="soft"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="% Mercado Interno" value={formatPercent(pctInterno, 1)} icon={Package} tone="green" />
          <KpiCard label="% Mercado Externo" value={formatPercent(pctExterno, 1)} icon={Package} tone="soft" />
          <KpiCard
            label="Contêineres (Mercado Externo)"
            value={totalContainers.toLocaleString("pt-BR")}
            icon={Package}
            tone="teal"
          />
        </div>

        <MonthlyBreakdown year={year} rows={monthlyRows} />

        <YearComparison yearAnterior={YEAR_ANTERIOR} yearAtual={YEAR_ATUAL} rows={comparisonRows} />
      </div>
    </div>
  );
}
