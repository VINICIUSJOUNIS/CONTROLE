import { Topbar } from "@/components/layout/topbar";
import { CalendarioEstufagensView } from "@/components/hedge/contratos/calendario-estufagens-view";
import { getContratosExportacao } from "@/lib/hedge-data";

export default async function CalendarioEstufagensPage() {
  const contratos = await getContratosExportacao();

  const rows = contratos.map((c) => ({
    id: c.id,
    contractNumber: c.contractNumber,
    clienteName: c.clienteName,
    dataEstufagem: c.dataEstufagem,
    dataEmbarque: c.dataEmbarque,
    quantSacas: c.quantSacas,
  }));

  return (
    <div className="flex flex-col">
      <Topbar title="Calendário de Estufagens" subtitle="Estufagens programadas por dia" />
      <div className="space-y-4 p-6">
        <CalendarioEstufagensView contratos={rows} />
      </div>
    </div>
  );
}
