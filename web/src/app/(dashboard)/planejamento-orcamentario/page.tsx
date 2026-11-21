import { Topbar } from "@/components/layout/topbar";
import { PlanejamentoView } from "@/components/planejamento/planejamento-view";
import { getBudgetPlan, getBudgetYears } from "@/lib/budget-data";
import type { BudgetScenario } from "@/generated/prisma/client";

// Orcamento: indicadores do plano, graficos e despesas por grupo. Historico e
// projecoes, premissas e tributos ficam em paginas proprias do modulo.
export default async function PlanejamentoOrcamentarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; cenario?: string }>;
}) {
  const params = await searchParams;
  const years = await getBudgetYears();
  const year = params.year ? Number(params.year) : years[0] ?? new Date().getFullYear();
  const plan = await getBudgetPlan(year, params.cenario as BudgetScenario | undefined);

  return (
    <div className="flex flex-col">
      <Topbar title="Orçamento" subtitle="Indicadores do plano, despesas por grupo e acompanhamento Previsto x Realizado" />
      <div className="space-y-6 p-6">
        {plan ? (
          <PlanejamentoView plan={plan} />
        ) : (
          <p className="text-center text-muted">Nenhum plano orçamentário cadastrado para {year}.</p>
        )}
      </div>
    </div>
  );
}
