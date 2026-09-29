import { Topbar } from "@/components/layout/topbar";
import { DevolucoesView } from "@/components/faturamento/devolucoes-view";
import { getSaleReturns, getSales } from "@/lib/data";

export default async function FaturamentoDevolucoesPage() {
  const [returns, sales] = await Promise.all([getSaleReturns(), getSales()]);
  const clientOptions = Array.from(new Set(sales.map((s) => s.clientName))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return (
    <div className="flex flex-col">
      <Topbar title="Devoluções" subtitle="Controle de devoluções de venda" />
      <div className="p-6">
        <DevolucoesView returns={returns} clientOptions={clientOptions} />
      </div>
    </div>
  );
}
