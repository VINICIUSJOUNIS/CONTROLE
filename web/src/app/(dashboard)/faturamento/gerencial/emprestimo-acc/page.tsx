import { Topbar } from "@/components/layout/topbar";
import { EmprestimosAccKpis } from "@/components/dashboard/emprestimos-acc-kpis";
import { GerencialFilter } from "@/components/faturamento/gerencial-filter";
import { getAvailableYears } from "@/lib/data";
import { periodLabel } from "@/lib/gerencial-shared";

export default async function ApresentacaoEmprestimoAccPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
}) {
  const { year = "", month = "", day = "" } = await searchParams;
  const years = await getAvailableYears();

  // getKpis filtra por mes (contractDate no formato YYYY-MM) - o dia do filtro
  // nao se aplica aqui (nao faz sentido cortar a carteira por dia exato), so
  // ano e mes.
  const range = year ? { from: `${year}-${month || "01"}`, to: `${year}-${month || "12"}` } : undefined;

  return (
    <div className="flex flex-col">
      <Topbar title="Emprestimo e ACC" />
      <div className="space-y-6 p-6">
        <GerencialFilter years={years} />

        <p className="text-sm text-muted">{periodLabel(year, month, day)}</p>

        <EmprestimosAccKpis range={range} compact />
      </div>
    </div>
  );
}
