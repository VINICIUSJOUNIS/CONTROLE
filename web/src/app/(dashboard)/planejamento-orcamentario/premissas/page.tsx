import { Topbar } from "@/components/layout/topbar";
import { PremissasPlano } from "@/components/planejamento/premissas-plano";
import { PremissasProjecao, ProjecaoProvider } from "@/components/planejamento/projecao-receita";
import { getContextoProjecao } from "@/lib/budget-data";

export default async function PremissasPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: yearParam } = await searchParams;
  const { year, plan, vendas, crescimentos } = await getContextoProjecao(yearParam);

  return (
    <div className="flex flex-col">
      <Topbar title="Premissas" subtitle="Premissas do plano orçamentário e da projeção de volume e receita" />
      <div className="space-y-6 p-6">
        {plan ? (
          <PremissasPlano plan={plan} />
        ) : (
          <p className="text-center text-muted">Nenhum plano orçamentário cadastrado para {year}.</p>
        )}
        {vendas.ultimoMesFechado && (
          <ProjecaoProvider
            historico={vendas.historico}
            ultimoMesFechado={vendas.ultimoMesFechado}
            cenarioInicial={plan?.scenario ?? "CONSERVADOR"}
            crescimentos={crescimentos}
            precoSalvoI={plan?.precoSacaInterno ?? null}
            precoSalvoE={plan?.precoSacaExterno ?? null}
          >
            <PremissasProjecao planId={plan?.id} planName={plan?.name} />
          </ProjecaoProvider>
        )}
      </div>
    </div>
  );
}
