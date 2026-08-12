import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { EmprestimoRelatorioView } from "@/components/emprestimos/emprestimo-relatorio-view";
import { getLoans } from "@/lib/data";
import { buildAmortizationSchedule } from "@/lib/amortization";

export default async function EmprestimoRelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loans = await getLoans();
  const loan = loans.find((l) => l.id === id);
  if (!loan) notFound();

  const vencimentoOverrides: Record<number, string> = {};
  for (const p of loan.parcelas) {
    if (p.vencimento) vencimentoOverrides[p.numero] = p.vencimento;
  }
  const schedule = buildAmortizationSchedule(loan, vencimentoOverrides);

  return (
    <div className="flex flex-col">
      <Topbar title="Relatório do Empréstimo" subtitle={loan.contractNumber} />
      <div className="p-6">
        <EmprestimoRelatorioView loan={loan} schedule={schedule} />
      </div>
    </div>
  );
}
