import { Topbar } from "@/components/layout/topbar";
import { HistoricoProjecoes, KpisProjecao, ProjecaoProvider } from "@/components/planejamento/projecao-receita";
import { getContextoProjecao } from "@/lib/budget-data";

export default async function HistoricoProjecoesPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  const { plan, vendas, crescimentos } = await getContextoProjecao(year);

  return (
    <div className="flex flex-col">
      <Topbar title="Histórico e Projeções" subtitle="Volume e receita por mercado: histórico de vendas e projeção do próximo ano" />
      <div className="space-y-6 p-6">
        {vendas.ultimoMesFechado ? (
          <ProjecaoProvider
            historico={vendas.historico}
            ultimoMesFechado={vendas.ultimoMesFechado}
            cenarioInicial={plan?.scenario ?? "CONSERVADOR"}
            crescimentos={crescimentos}
            precoSalvoI={plan?.precoSacaInterno ?? null}
            precoSalvoE={plan?.precoSacaExterno ?? null}
          >
            <div className="space-y-6">
              <KpisProjecao />
              <HistoricoProjecoes />
            </div>
          </ProjecaoProvider>
        ) : (
          <p className="text-center text-muted">Sem vendas fechadas para montar o histórico.</p>
        )}
      </div>
    </div>
  );
}
