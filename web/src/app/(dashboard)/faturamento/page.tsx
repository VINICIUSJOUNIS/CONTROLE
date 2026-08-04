import { Topbar } from "@/components/layout/topbar";
import { FaturamentoView } from "@/components/faturamento/faturamento-view";
import { getSales } from "@/lib/data";

export default async function FaturamentoPage() {
  const sales = await getSales();

  return (
    <div className="flex flex-col">
      <Topbar title="Faturamento" subtitle="Controle de vendas por cliente, interno e externo" />
      <div className="p-6">
        <FaturamentoView sales={sales} />
      </div>
    </div>
  );
}
