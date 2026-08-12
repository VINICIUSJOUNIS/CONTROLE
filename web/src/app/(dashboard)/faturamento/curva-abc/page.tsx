import { Topbar } from "@/components/layout/topbar";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { CurvaAbcView } from "@/components/faturamento/curva-abc-view";
import { getSales } from "@/lib/data";
import { formatMonthLabel } from "@/lib/format";

export default async function CurvaAbcPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const allSales = await getSales();
  const years = Array.from(new Set(allSales.map((s) => s.saleDate.slice(0, 4)))).sort();

  const sales = allSales.filter((s) => {
    const month = s.saleDate.slice(0, 7);
    if (from && month < from) return false;
    if (to && month > to) return false;
    return true;
  });
  const internos = sales.filter((s) => s.clientType === "INTERNO");
  const externos = sales.filter((s) => s.clientType === "EXTERNO");

  const periodLabel =
    from && to ? `${formatMonthLabel(from)} a ${formatMonthLabel(to)}` : "Todo o período";

  return (
    <div className="flex flex-col">
      <Topbar
        title="Curva ABC"
        subtitle="Classificação ABC dos 10 maiores clientes — mercado interno e externo"
      />
      <div className="space-y-4 p-6">
        <div className="print:hidden">
          <PeriodFilter years={years} />
        </div>
        <CurvaAbcView internos={internos} externos={externos} periodLabel={periodLabel} />
      </div>
    </div>
  );
}
