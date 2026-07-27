import { Topbar } from "@/components/layout/topbar";
import { EmprestimosView } from "@/components/emprestimos/emprestimos-view";
import { getBanks, getLoans } from "@/lib/data";

export default async function EmprestimosPage() {
  const [banks, loans] = await Promise.all([getBanks(), getLoans()]);

  return (
    <div className="flex flex-col">
      <Topbar title="Emprestimos" subtitle="Cadastro e controle de operacoes de emprestimo" />
      <div className="p-6">
        <EmprestimosView banks={banks} initialLoans={loans} />
      </div>
    </div>
  );
}
