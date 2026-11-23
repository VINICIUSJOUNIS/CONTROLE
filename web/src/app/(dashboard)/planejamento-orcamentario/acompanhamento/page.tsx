import { Topbar } from "@/components/layout/topbar";
import { AcompanhamentoMensal } from "@/components/planejamento/acompanhamento-mensal";
import { getBudgetPlan, getBudgetYears } from "@/lib/budget-data";

// Acompanhamento Mensal: lancamento e acompanhamento do realizado mes a mes
// contra o previsto do plano (cenario salvo em Premissas).
export default async function AcompanhamentoPage({ searchParams }: { searchParams: Promise<{ year?: string; mes?: string }> }) {
  const params = await searchParams;
  const years = await getBudgetYears();
  const year = params.year ? Number(params.year) : years[0] ?? new Date().getFullYear();
  const plan = await getBudgetPlan(year);
  const mesParam = Number(params.mes);
  const mesInicial = Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12 ? mesParam : new Date().getMonth() + 1;

  return (
    <div className="flex flex-col">
      <Topbar title="Acompanhamento Mensal" subtitle="Lançamento e acompanhamento do orçamento mês a mês: previsto x realizado" />
      <div className="space-y-6 p-6">
        {plan ? (
          <AcompanhamentoMensal plan={plan} mesInicial={mesInicial} />
        ) : (
          <p className="text-center text-muted">Nenhum plano orçamentário cadastrado para {year}.</p>
        )}
      </div>
    </div>
  );
}
