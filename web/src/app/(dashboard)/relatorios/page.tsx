import { Topbar } from "@/components/layout/topbar";
import { RelatorioContratosAbertos } from "@/components/relatorios/relatorio-contratos-abertos";
import { getOpenAccReport, getOpenLoansReport } from "@/lib/data";

export default async function RelatoriosPage() {
  const [openLoans, openAcc] = await Promise.all([getOpenLoansReport(), getOpenAccReport()]);

  return (
    <div className="flex flex-col">
      <Topbar title="Relatorios" subtitle="Relatorios da carteira de emprestimos e ACC" />
      <div className="space-y-6 p-6 print:space-y-12 print:p-0">
        <RelatorioContratosAbertos
          title="Emprestimos em aberto"
          filePrefix="emprestimos-em-aberto"
          rows={openLoans}
        />
        <RelatorioContratosAbertos title="ACC em aberto" filePrefix="acc-em-aberto" rows={openAcc} />
      </div>
    </div>
  );
}
