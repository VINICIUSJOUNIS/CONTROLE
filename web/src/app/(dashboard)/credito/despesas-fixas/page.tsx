import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EnviarBalancete, ExcluirMesDespesas, IncluirDespesa, TabelaFixas } from "@/components/credito/despesas-fixas-cliente";
import { listarAjustesDespesa, listarBalancetesDespesas } from "@/lib/credito/despesas-dados";
import { resumir } from "@/lib/credito/despesas";
import { listarRegistrosCredito } from "@/lib/credito/dados";
import { analisar, rotuloCompetencia } from "@/lib/credito/calculos";
import { DocumentosLinks } from "@/components/credito/documentos-links";

const brl = (v: number | null) =>
  v === null ? "-" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v);
const pct = (v: number | null) => (v === null || !Number.isFinite(v) ? "-" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`);

export default async function DespesasFixasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const [balancetes, ajustes, registrosCredito] = await Promise.all([listarBalancetesDespesas(), listarAjustesDespesa(), listarRegistrosCredito()]);
  const atual = balancetes.find((b) => b.competencia === mes) ?? balancetes[balancetes.length - 1];

  return (
    <>
      <Topbar title="Despesas Fixas" subtitle="Análise de Crédito - despesas fixas do balancete, conta a conta" />
      <div className="space-y-6 p-6">
        <EnviarBalancete />
        {!atual ? (
          <p className="text-sm text-muted">Nenhum balancete incluído.</p>
        ) : (
          <Conteudo
            atual={atual}
            balancetes={balancetes}
            ajustes={ajustes}
            credito={registrosCredito}
          />
        )}
      </div>
    </>
  );
}

async function Conteudo({
  atual,
  balancetes,
  ajustes,
  credito,
}: {
  atual: Awaited<ReturnType<typeof listarBalancetesDespesas>>[number];
  balancetes: Awaited<ReturnType<typeof listarBalancetesDespesas>>;
  ajustes: Awaited<ReturnType<typeof listarAjustesDespesa>>;
  credito: Awaited<ReturnType<typeof listarRegistrosCredito>>;
}) {
  const r = resumir(atual.contas, atual.competencia, ajustes);
  const anterior = balancetes[balancetes.indexOf(atual) - 1]; // mes anterior cadastrado
  const rAnt = anterior ? resumir(anterior.contas, anterior.competencia, ajustes) : null;

  // Cruzamento com a Analise de Credito do mesmo mes: receita, CMV e margem de contribuicao.
  const regCredito = credito.find((c) => c.competencia === atual.competencia);
  const dre = regCredito ? analisar(regCredito, credito).dre : null;
  const linha = (rot: string) => dre?.find((l) => l.rotulo === rot)?.valor ?? null;
  const receitaLiquida = linha("Receita Líquida");
  const cmv = linha("(-) Custo das Mercadorias Vendidas");
  const margemContrib =
    receitaLiquida && cmv !== null ? (receitaLiquida + cmv - r.porNatureza.variavel.mes) / receitaLiquida : null; // cmv vem negativo na DRE
  const fixaBase = r.fixasMediaMensal; // base normalizada: media mensal do ano (suaviza despesas anuais e provisoes)
  const deprecMedia = r.fixasPorCategoria.find((c) => c.categoria === "Depreciação e amortização")?.media ?? 0;
  const peContabil = margemContrib && margemContrib > 0 ? fixaBase / margemContrib : null;
  const peFinanceiro = margemContrib && margemContrib > 0 ? (fixaBase - deprecMedia) / margemContrib : null;


  const cards = [
    { t: `Despesas fixas de ${rotuloCompetencia(atual.competencia)}`, v: brl(r.fixasMes), s: rAnt ? `mês anterior: ${brl(rAnt.fixasMes)}` : r.fixasMediaAnterior !== null ? `média mensal até o mês anterior: ${brl(r.fixasMediaAnterior)}` : undefined },
    { t: "Fixas que saem do caixa (sem depreciação)", v: brl(r.fixasMesCaixa) },
    { t: "Acumulado no ano", v: brl(r.fixasAcumulado), s: `${r.meses} ${r.meses === 1 ? "mês" : "meses"}` },
    { t: "Média mensal do ano", v: brl(r.fixasMediaMensal), s: "base normalizada para planejamento" },
    { t: "Fixas sobre a receita líquida do mês", v: pct(receitaLiquida ? r.fixasMes / receitaLiquida : null), s: receitaLiquida ? `receita líquida ${brl(receitaLiquida)}` : "mês sem Análise de Crédito" },
    { t: "Ponto de equilíbrio contábil (receita/mês)", v: brl(peContabil), s: margemContrib !== null ? `margem de contribuição ${pct(margemContrib)}` : "precisa da Análise de Crédito do mês" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm">
            <p className="font-semibold">{atual.empresa}</p>
            <p className="text-muted">
              CNPJ {atual.cnpj} · Balancete de {rotuloCompetencia(atual.competencia)} ·{" "}
              <DocumentosLinks arquivos={atual.arquivos} documentos={atual.documentos} />
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {balancetes.map((b) => (
              <Link
                key={b.id}
                href={`/credito/despesas-fixas?mes=${b.competencia}`}
                className={cn("rounded-md border border-border px-2.5 py-1 text-xs", b.id === atual.id ? "bg-primary text-primary-foreground" : "hover:bg-border/40")}
              >
                {rotuloCompetencia(b.competencia)}
              </Link>
            ))}
            <ExcluirMesDespesas id={atual.id} rotulo={rotuloCompetencia(atual.competencia)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.t}>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted">{c.t}</p>
              <p className="text-lg font-semibold">{c.v}</p>
              {c.s && <p className="text-xs text-muted">{c.s}</p>}
            </CardContent>
          </Card>
        ))}
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Despesas fixas por categoria (clique para abrir as contas)</CardTitle>
        </CardHeader>
        <CardContent>
          <IncluirDespesa balanceteId={atual.id} />
          <TabelaFixas balanceteId={atual.id} categorias={r.fixasPorCategoria} totalMes={r.fixasMes} totalAcumulado={r.fixasAcumulado} meses={r.meses} />
        </CardContent>
      </Card>

      {margemContrib !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Ponto de equilíbrio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted">
              Receita mensal mínima para cobrir as despesas fixas, dada a margem de contribuição do mês: (receita líquida − CMV − despesas variáveis) ÷ receita líquida.
            </p>
            <table className="text-sm">
              <tbody>
                <tr><td className="py-0.5 pr-6">Receita líquida do mês</td><td className="text-right tabular-nums">{brl(receitaLiquida)}</td></tr>
                <tr><td className="py-0.5 pr-6">(-) CMV</td><td className="text-right tabular-nums">{brl(cmv)}</td></tr>
                <tr><td className="py-0.5 pr-6">(-) Despesas variáveis (comissões, fretes, exportação, armazenagem...)</td><td className="text-right tabular-nums">{brl(-r.porNatureza.variavel.mes)}</td></tr>
                <tr className="font-semibold"><td className="py-0.5 pr-6">= Margem de contribuição</td><td className="text-right tabular-nums">{pct(margemContrib)}</td></tr>
                <tr><td className="py-0.5 pr-6">Despesas fixas - média mensal do ano</td><td className="text-right tabular-nums">{brl(fixaBase)}</td></tr>
                <tr className="font-semibold"><td className="py-0.5 pr-6">Ponto de equilíbrio contábil (fixas ÷ margem)</td><td className="text-right tabular-nums">{brl(peContabil)}</td></tr>
                <tr><td className="py-0.5 pr-6">Ponto de equilíbrio financeiro (sem depreciação)</td><td className="text-right tabular-nums">{brl(peFinanceiro)}</td></tr>
              </tbody>
            </table>
            {receitaLiquida && peContabil && (
              <p>
                A receita do mês foi {(receitaLiquida / peContabil).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x o ponto de equilíbrio. Margem de segurança:{" "}
                {pct((receitaLiquida - peContabil) / receitaLiquida)}.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
