import { Topbar } from "@/components/layout/topbar";
import { CalendarioEstufagensView } from "@/components/hedge/contratos/calendario-estufagens-view";
import { getContratosExportacao, getConfirmacoesNegocio } from "@/lib/hedge-data";

export default async function CalendarioEstufagensPage() {
  const [contratos, confirmacoes] = await Promise.all([
    getContratosExportacao(),
    getConfirmacoesNegocio(),
  ]);

  // A quantidade de sacas do calendario vem da ficha de Confirmacao de
  // Negocio (preenchida no inicio do processo) - so cai para o campo de
  // Recebimento do contrato se aquela ficha ainda nao foi preenchida.
  const rows = contratos.map((c) => ({
    id: c.id,
    contractNumber: c.contractNumber,
    clienteName: c.clienteName,
    dataEstufagem: c.dataEstufagem,
    dataEmbarque: c.dataEmbarque,
    quantSacas: confirmacoes[c.id]?.quantidadeSacas ?? c.quantSacas,
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
