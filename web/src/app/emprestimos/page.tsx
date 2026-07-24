import { Topbar } from "@/components/layout/topbar";
import { EmprestimosView } from "@/components/emprestimos/emprestimos-view";

export default function EmprestimosPage() {
  return (
    <div className="flex flex-col">
      <Topbar title="Emprestimos" subtitle="Cadastro e controle de operacoes de emprestimo" />
      <div className="p-6">
        <EmprestimosView />
      </div>
    </div>
  );
}
