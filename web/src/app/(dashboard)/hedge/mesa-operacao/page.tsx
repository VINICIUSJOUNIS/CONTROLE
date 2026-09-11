import Link from "next/link";
import { Calendar } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { MesaOperacaoBoard } from "@/components/hedge/contratos/mesa-operacao-board";
import { getClientes, getContratosExportacao } from "@/lib/hedge-data";

export default async function MesaOperacaoPage() {
  const [clientes, todosContratos] = await Promise.all([getClientes(), getContratosExportacao()]);
  const contratos = todosContratos.filter((c) => !c.contratoFinalizado);

  return (
    <div className="flex flex-col">
      <Topbar
        title="Mesa de Operacao"
        subtitle="Acompanhe os contratos pelas etapas de exportacao"
      />
      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <Link
            href="/hedge/mesa-operacao/calendario"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-border/40 hover:text-foreground"
          >
            <Calendar size={15} />
            Calendário de Estufagens
          </Link>
        </div>
        <MesaOperacaoBoard clientes={clientes} contratos={contratos} />
      </div>
    </div>
  );
}
