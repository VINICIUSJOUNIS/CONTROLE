import { Topbar } from "@/components/layout/topbar";
import { EmprestimosAccKpis } from "@/components/dashboard/emprestimos-acc-kpis";

export default function ApresentacaoEmprestimoAccPage() {
  return (
    <div className="flex flex-col">
      <Topbar title="Emprestimo e ACC" />
      <div className="p-6">
        <EmprestimosAccKpis compact />
      </div>
    </div>
  );
}
