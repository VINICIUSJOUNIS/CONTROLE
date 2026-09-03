import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { GerencialFilter } from "@/components/faturamento/gerencial-filter";
import { getSales, getSaleReturns } from "@/lib/data";
import { matchesPeriod, periodLabel } from "@/lib/gerencial-shared";
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
      </div>
    </div>
  );
}
