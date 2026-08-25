import { Topbar } from "@/components/layout/topbar";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { TopClientesReport, type ClientRankRow } from "@/components/faturamento/top-clientes-report";
import { getSales, getSaleReturns, getAvailableYears, type SaleRow, type SaleReturnRow } from "@/lib/data";

const TOP_CLIENTES = 20;

type ClientAgg = { sacas: number; valueBRL: number; country: string | null };

// Mesma logica de ranqueamento usada no dashboard de Faturamento e no
// relatorio comparativo de vendas.
function rankClients(rows: SaleRow[], returns: SaleReturnRow[]): [string, ClientAgg][] {
  const map = new Map<string, ClientAgg>();
  for (const s of rows) {
    const cur = map.get(s.clientName) ?? { sacas: 0, valueBRL: 0, country: s.country };
    cur.sacas += s.quantitySacas;
    cur.valueBRL += s.valueBRL;
    map.set(s.clientName, cur);
  }
  for (const r of returns) {
    const cur = map.get(r.clientName);
    if (!cur) continue;
    cur.sacas -= r.quantitySacas;
    cur.valueBRL -= r.valueBRL;
  }
  return [...map.entries()].sort((a, b) => b[1].valueBRL - a[1].valueBRL);
}

export default async function RelatorioClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const [allSales, allReturns, years] = await Promise.all([getSales(), getSaleReturns(), getAvailableYears()]);

  function inPeriod(dateStr: string) {
    const month = dateStr.slice(0, 7);
    if (from && month < from) return false;
    if (to && month > to) return false;
    return true;
  }

  const sales = allSales.filter((s) => inPeriod(s.saleDate));
  const returns = allReturns.filter((r) => inPeriod(r.returnDate));

  const internos = sales.filter((s) => s.clientType === "INTERNO");
  const externos = sales.filter((s) => s.clientType === "EXTERNO");
  const returnsInternos = returns.filter((r) => r.clientType === "INTERNO");
  const returnsExternos = returns.filter((r) => r.clientType === "EXTERNO");

  const topInternos: ClientRankRow[] = rankClients(internos, returnsInternos)
    .slice(0, TOP_CLIENTES)
    .map(([name, agg]) => ({ name, ...agg }));
  const topExternos: ClientRankRow[] = rankClients(externos, returnsExternos)
    .slice(0, TOP_CLIENTES)
    .map(([name, agg]) => ({ name, ...agg }));

  const periodLabel = from || to ? `Período: ${from ?? "início"} a ${to ?? "hoje"}` : "Todos os períodos";

  return (
    <div className="flex flex-col">
      <Topbar title="Relatório de Clientes" subtitle="Maiores clientes por mercado, filtrável por período" />
      <div className="space-y-6 p-6 print:space-y-2 print:p-0">
        <div className="print:hidden">
          <PeriodFilter years={years} />
        </div>

        <TopClientesReport
          periodLabel={periodLabel}
          internos={topInternos}
          externos={topExternos}
          topCount={TOP_CLIENTES}
        />
      </div>
    </div>
  );
}
