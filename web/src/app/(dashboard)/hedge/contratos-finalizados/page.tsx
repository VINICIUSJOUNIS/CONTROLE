import { Topbar } from "@/components/layout/topbar";
import { ContratosFinalizadosList } from "@/components/hedge/contratos/contratos-finalizados-list";
import {
  getContratosExportacao,
  getConfirmacoesNegocio,
  getContratoAnexosPorContrato,
  getChecklistPorContrato,
  getEnviosAmostra,
} from "@/lib/hedge-data";

export default async function ContratosFinalizadosPage() {
  const [contratos, confirmacoes, anexos, checklist, enviosAmostra] = await Promise.all([
    getContratosExportacao(),
    getConfirmacoesNegocio(),
    getContratoAnexosPorContrato(),
    getChecklistPorContrato(),
    getEnviosAmostra(),
  ]);
  const finalizados = contratos.filter((c) => c.contratoFinalizado);

  return (
    <div className="flex flex-col">
      <Topbar title="Contratos Finalizados" subtitle="Contratos que já concluíram a Mesa de Operação" />
      <div className="space-y-6 p-6">
        <ContratosFinalizadosList
          contratos={finalizados}
          confirmacoes={confirmacoes}
          anexos={anexos}
          checklist={checklist}
          enviosAmostra={enviosAmostra}
        />
      </div>
    </div>
  );
}
