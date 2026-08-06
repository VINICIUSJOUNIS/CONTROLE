import { Topbar } from "@/components/layout/topbar";
import { FaturamentoView } from "@/components/faturamento/faturamento-view";
import { getSales, getSaleReturns } from "@/lib/data";

export default async function FaturamentoVendasPage() {
  const [sales, returns] = await Promise.all([getSales(), getSaleReturns()]);

  return (
    <div className="flex flex-col">
      <Topbar title="Vendas" subtitle="Controle de vendas por cliente, interno e externo" />
      <div className="p-6">
        <FaturamentoView sales={sales} returns={returns} />
      </div>
    </div>
  );
}
