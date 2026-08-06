import { Topbar } from "@/components/layout/topbar";
import { DevolucoesView } from "@/components/faturamento/devolucoes-view";
import { getSaleReturns } from "@/lib/data";

export default async function FaturamentoDevolucoesPage() {
  const returns = await getSaleReturns();

  return (
    <div className="flex flex-col">
      <Topbar title="Devoluções" subtitle="Controle de devoluções de venda" />
      <div className="p-6">
        <DevolucoesView returns={returns} />
      </div>
    </div>
  );
}
