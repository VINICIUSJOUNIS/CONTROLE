import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GerencialFilter } from "@/components/faturamento/gerencial-filter";
import { getSales, getSaleReturns, getKpis } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { DollarSign, PiggyBank } from "lucide-react";

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
  const [allSales, allReturns, kpis] = await Promise.all([getSales(), getSaleReturns(), getKpis()]);
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

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Posição atual — Empréstimos e ACC
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <KpiCard
              label="Empréstimos em aberto (R$)"
              value={formatCurrency(kpis.saldoDevedorLoans)}
              icon={PiggyBank}
              tone="teal"
            />
            <KpiCard
              label="ACC em aberto (R$)"
              value={formatCurrency(kpis.saldoDevedorAcc)}
              icon={PiggyBank}
              tone="green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
