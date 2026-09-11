import { Topbar } from "@/components/layout/topbar";
import { ContratosFinalizadosList } from "@/components/hedge/contratos/contratos-finalizados-list";
import { getContratosExportacao } from "@/lib/hedge-data";

export default async function ContratosFinalizadosPage() {
  const contratos = await getContratosExportacao();
  const finalizados = contratos.filter((c) => c.contratoFinalizado);

  return (
    <div className="flex flex-col">
      <Topbar title="Contratos Finalizados" subtitle="Contratos que já concluíram a Mesa de Operação" />
      <div className="space-y-6 p-6">
        <ContratosFinalizadosList contratos={finalizados} />
      </div>
    </div>
  );
}
