import { Topbar } from "@/components/layout/topbar";
import { PlanejamentoView } from "@/components/planejamento/planejamento-view";
import { getBudgetPlan, getBudgetYears, getHistoricoVendasMensal } from "@/lib/budget-data";
import { addMonths, MESES_CURTOS, somaJanela } from "@/lib/budget-projecao";
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
  const [plan, vendas] = await Promise.all([
    getBudgetPlan(year, params.cenario as BudgetScenario | undefined),
    getHistoricoVendasMensal(),
  ]);
  // Ano anterior ao orcado = ultimos 12 meses fechados de vendas reais (o ano
  // corrente ainda nao fechou), mesma base da projecao.
  const u = vendas.ultimoMesFechado;
  const anoAnterior = u
    ? (() => {
        const de = addMonths(u, -11);
        const i = somaJanela(vendas.historico, de, u, "INTERNO");
        const e = somaJanela(vendas.historico, de, u, "EXTERNO");
        const mes = (ym: string) => `${MESES_CURTOS[Number(ym.slice(5, 7)) - 1].toLowerCase()}/${ym.slice(2, 4)}`;
        return {
          rotulo: `${u.slice(0, 4)} (12 meses até ${mes(u)})`,
          volume: i.sacas + e.sacas,
          volInt: i.sacas,
          volExt: e.sacas,
          receita: i.receita + e.receita,
        };
      })()
    : null;

  return (
    <div className="flex flex-col">
      <Topbar title="Orçamento" subtitle="Indicadores do plano, despesas por grupo e acompanhamento Previsto x Realizado" />
      <div className="space-y-6 p-6">
        {plan ? (
          <PlanejamentoView plan={plan} anoAnterior={anoAnterior} />
        ) : (
          <p className="text-center text-muted">Nenhum plano orçamentário cadastrado para {year}.</p>
        )}
      </div>
    </div>
  );
}
