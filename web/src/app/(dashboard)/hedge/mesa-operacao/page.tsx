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
        <MesaOperacaoBoard clientes={clientes} contratos={contratos} />
      </div>
    </div>
  );
}
