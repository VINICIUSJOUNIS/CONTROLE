import { Topbar } from "@/components/layout/topbar";
import { HistoricoDolarView } from "@/components/hedge-cambial/historico-dolar-view";
import { getHistoricoPtax, sincronizarPtaxSilencioso } from "@/lib/hedge-cambial/ptax";

export default async function HistoricoDolarPage() {
  await sincronizarPtaxSilencioso();
  const historico = await getHistoricoPtax();

  return (
    <div className="flex flex-col">
      <Topbar
        title="Historico do Dolar (PTAX)"
        subtitle="PTAX de fechamento do Banco Central, compra e venda, gravada automaticamente todo dia util"
      />
      <div className="p-6">
        <HistoricoDolarView historico={historico} />
      </div>
    </div>
  );
}
