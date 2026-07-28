import { Topbar } from "@/components/layout/topbar";
import { ContratosTable } from "@/components/contratos/contratos-table";
import { getClientes, getContratosExportacao, getCorretoras } from "@/lib/data";

export default async function ContratosPage() {
  const [clientes, contratos, corretoras] = await Promise.all([
    getClientes(),
    getContratosExportacao(),
    getCorretoras(),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar title="Contratos" subtitle="Cadastro completo dos contratos de exportacao" />
      <div className="space-y-6 p-6">
        <ContratosTable clientes={clientes} contratos={contratos} corretoras={corretoras} />
      </div>
    </div>
  );
}
