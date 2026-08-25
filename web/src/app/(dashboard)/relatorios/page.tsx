import { Topbar } from "@/components/layout/topbar";
import { RelatorioContratosAbertos } from "@/components/relatorios/relatorio-contratos-abertos";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { ModalidadeFilter } from "@/components/dashboard/modalidade-filter";
import {
  getOpenAccReport,
  getOpenLoansReport,
  getLoansReport,
  getAccReport,
  getAvailableYears,
  PeriodRange,
  ModalidadeFilter as ModalidadeFilterValue,
} from "@/lib/data";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; modalidade?: string }>;
}) {
  const params = await searchParams;
  const range: PeriodRange | undefined =
    params.from || params.to ? { from: params.from, to: params.to } : undefined;
  const modalidade: ModalidadeFilterValue =
    params.modalidade === "EMPRESTIMOS" || params.modalidade === "ACC" ? params.modalidade : "TODOS";

  const [openLoans, openAcc, periodLoans, periodAcc, years] = await Promise.all([
    getOpenLoansReport(),
    getOpenAccReport(),
    modalidade === "ACC" ? Promise.resolve([]) : getLoansReport(range),
    modalidade === "EMPRESTIMOS" ? Promise.resolve([]) : getAccReport(range),
    getAvailableYears(),
  ]);

  const openRows = [
    ...openLoans.map((r) => ({ ...r, tipo: "Emprestimo" as const })),
    ...openAcc.map((r) => ({ ...r, tipo: "ACC" as const })),
  ].sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const periodRows = [
    ...periodLoans.map((r) => ({ ...r, tipo: "Emprestimo" as const })),
    ...periodAcc.map((r) => ({ ...r, tipo: "ACC" as const })),
  ].sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return (
    <div className="flex flex-col">
      <Topbar title="Relatorios" subtitle="Relatorios da carteira de emprestimos e ACC" />
      <div className="space-y-6 p-6 print:p-0">
        <RelatorioContratosAbertos
          title="Emprestimos e ACC em aberto"
          filePrefix="emprestimos-e-acc-em-aberto"
          rows={openRows}
        />

        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <PeriodFilter years={years} />
          <ModalidadeFilter />
        </div>

        <RelatorioContratosAbertos
          title="Emprestimos e ACC por periodo"
          filePrefix="emprestimos-e-acc-por-periodo"
          rows={periodRows}
        />
      </div>
    </div>
  );
}
