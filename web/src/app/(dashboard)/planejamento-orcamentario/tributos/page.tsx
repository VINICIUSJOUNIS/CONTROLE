import { Topbar } from "@/components/layout/topbar";
import { ProjecaoProvider, TributosProjecao } from "@/components/planejamento/projecao-receita";
import { getContextoProjecao } from "@/lib/budget-data";

export default async function TributosPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year } = await searchParams;
  const { plan, vendas, baseFiscal, despesasCreditaveis, crescimentos } = await getContextoProjecao(year);
  const ano = vendas.ultimoMesFechado ? Number(vendas.ultimoMesFechado.slice(0, 4)) + 1 : new Date().getFullYear() + 1;

  return (
    <div className="flex flex-col">
      <Topbar title={`Tributos ${ano}`} subtitle="O que pagamos e o que aproveitamos de crédito, na venda e na compra de café (reforma tributária)" />
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
            <TributosProjecao baseFiscal={baseFiscal} despesasCreditaveis={despesasCreditaveis} />
          </ProjecaoProvider>
        ) : (
          <p className="text-center text-muted">Sem vendas fechadas para estimar a receita.</p>
        )}
      </div>
    </div>
  );
}
