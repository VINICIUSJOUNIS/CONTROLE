import { Topbar } from "@/components/layout/topbar";
import { PlanejamentoView } from "@/components/planejamento/planejamento-view";
import { ProjecaoReceita } from "@/components/planejamento/projecao-receita";
import { getBaseFiscalDre, getBudgetPlan, getBudgetYears, getHistoricoVendasMensal } from "@/lib/budget-data";

export default async function PlanejamentoOrcamentarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const years = await getBudgetYears();
  const year = params.year ? Number(params.year) : years[0] ?? new Date().getFullYear();
  const [plan, vendas, baseFiscal] = await Promise.all([getBudgetPlan(year), getHistoricoVendasMensal(), getBaseFiscalDre()]);
  // Despesas previstas com fornecedores PJ (geram credito de CBS/IBS em 2027):
  // mercado interno/externo, administrativas e, do custo do fornecedor, so
  // fretes e armazenagem (o custo do cafe e o Funrural ficam de fora).
  const despesasCreditaveis = (plan?.groups ?? [])
    .flatMap((g) => g.lines.map((l) => ({ group: g.group, name: l.name, total: l.totalPrevisto })))
    .filter(
      (l) =>
        ["DESPESA_MERCADO_INTERNO", "DESPESA_MERCADO_EXTERNO", "DESPESA_ADM_FIXA", "DESPESA_ADM_VARIAVEL"].includes(l.group) ||
        (l.group === "CUSTO_FORNECEDOR" && /frete|armazen/i.test(l.name))
    )
    .reduce((s, l) => s + l.total, 0);

  return (
    <div className="flex flex-col">
      <Topbar
        title="Planejamento Orçamentário"
        subtitle="Cenários de receita, despesas por grupo e acompanhamento Previsto x Realizado"
      />
      <div className="space-y-6 p-6">
        {plan ? (
          <PlanejamentoView plan={plan} />
        ) : (
          <p className="text-center text-muted">Nenhum plano orçamentário cadastrado para {year}.</p>
        )}
        {vendas.ultimoMesFechado && (
          <ProjecaoReceita
            historico={vendas.historico}
            ultimoMesFechado={vendas.ultimoMesFechado}
            cenarioInicial={plan?.scenario ?? "CONSERVADOR"}
            planId={plan?.id}
            planName={plan?.name}
            baseFiscal={baseFiscal}
            despesasCreditaveis={despesasCreditaveis}
            crescimentos={{
              CONSERVADOR: 0,
              MODERADO: plan?.crescimentoModerado ?? 0,
              OTIMISTA: plan?.crescimentoOtimista ?? 0,
              MUITO_OTIMISTA: plan?.crescimentoMuitoOtimista ?? 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
