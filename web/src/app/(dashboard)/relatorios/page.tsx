import { Topbar } from "@/components/layout/topbar";
import { RelatorioContratosAbertos } from "@/components/relatorios/relatorio-contratos-abertos";
import { getOpenAccReport, getOpenLoansReport } from "@/lib/data";

export default async function RelatoriosPage() {
  const [openLoans, openAcc] = await Promise.all([getOpenLoansReport(), getOpenAccReport()]);

  const rows = [
    ...openLoans.map((r) => ({ ...r, tipo: "Emprestimo" as const })),
    ...openAcc.map((r) => ({ ...r, tipo: "ACC" as const })),
  ].sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return (
    <div className="flex flex-col">
      <Topbar title="Relatorios" subtitle="Relatorios da carteira de emprestimos e ACC" />
      <div className="space-y-6 p-6 print:p-0">
        <RelatorioContratosAbertos
          title="Emprestimos e ACC em aberto"
          filePrefix="emprestimos-e-acc-em-aberto"
          rows={rows}
        />
      </div>
    </div>
  );
}
