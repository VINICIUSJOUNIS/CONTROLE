import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { CalendarioEstufagensView } from "@/components/hedge/contratos/calendario-estufagens-view";
import { getContratosExportacao } from "@/lib/hedge-data";
import { ArrowLeft } from "lucide-react";

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
        <Link
          href="/hedge/mesa-operacao"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Voltar para a Mesa de Operações
        </Link>

        <CalendarioEstufagensView contratos={rows} />
      </div>
    </div>
  );
}
