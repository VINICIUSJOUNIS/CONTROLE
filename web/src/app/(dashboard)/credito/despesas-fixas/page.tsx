import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ContasExcluidas, EnviarBalancete, ExcluirMesDespesas, TabelaFixas } from "@/components/credito/despesas-fixas-cliente";
import { listarAjustesDespesa, listarBalancetesDespesas } from "@/lib/credito/despesas-dados";
import { resumir } from "@/lib/credito/despesas";
import { listarRegistrosCredito } from "@/lib/credito/dados";
import { analisar, rotuloCompetencia } from "@/lib/credito/calculos";

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

  const somaContas = atual.contas.reduce((s, c) => s + c.saldoAtual, 0);
  const somaMes = atual.contas.reduce((s, c) => s + c.debito - c.credito, 0);
  const confere = Math.abs(somaContas - atual.totalPdf.saldoAtual) < 1 && Math.abs(somaMes - (atual.totalPdf.debito - atual.totalPdf.credito)) < 1;
  const alertas = r.contas.filter((c) => c.natureza === "fixa" && c.alerta);
  const naoFixas = r.contas.filter((c) => c.natureza !== "fixa").sort((a, b) => b.saldoAtual - a.saldoAtual);

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
              CNPJ {atual.cnpj} · Balancete de {rotuloCompetencia(atual.competencia)} · {atual.arquivos.join(", ")}
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

      {alertas.length > 0 && (
        <Card className="border-warning">
          <CardContent className="flex gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} />
            <div>
              <p className="font-medium">Pontos para conferir com a contabilidade</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
                {alertas.map((a) => (
                  <li key={a.classificacao}>
                    {a.descricao} ({a.classificacao}): {a.alerta} Mês {brl(a.valorMes)}; média anterior {brl(a.mediaAnterior)}.
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Despesas fixas por categoria (clique para abrir as contas)</CardTitle>
        </CardHeader>
        <CardContent>
          <TabelaFixas categorias={r.fixasPorCategoria} totalMes={r.fixasMes} totalAcumulado={r.fixasAcumulado} meses={r.meses} />
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

      <Card>
        <CardHeader>
          <CardTitle>Conferência e critério contábil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-2">
            {confere ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />}
            <p>
              {confere ? "Confere" : "Diferença"}: as {atual.contas.length} contas analíticas somam {brl(somaContas)} no ano e {brl(somaMes)} no mês; o total do grupo de despesas operacionais (4.2) no PDF é{" "}
              {brl(atual.totalPdf.saldoAtual)} no ano e {brl(atual.totalPdf.debito - atual.totalPdf.credito)} no mês.
            </p>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>
              <span className="font-medium text-foreground">Despesa fixa</span> é a que existe com ou sem venda, dentro da estrutura atual (pessoal, aluguel, utilidades, serviços contínuos, tecnologia, seguros, depreciação). Não varia com o volume embarcado.
            </li>
            <li>Regime de competência: o valor do mês é o débito menos o crédito da conta no balancete; o acumulado é o saldo atual (janeiro até o mês).</li>
            <li>
              A folha entra pelas contas de despesa com pessoal (4.2.2.01), incluindo encargos (INSS, FGTS) e provisões de férias e 13º. As obrigações a pagar do passivo (salários, INSS, FGTS a recolher) não são somadas de novo, para não contar a folha duas vezes.
            </li>
            <li>Ficam fora: despesas variáveis (comissões, fretes, exportação, armazenagem, viagens), não recorrentes (reformas, indenizações, processos, multas, doações) e financeiras (juros, tarifas, IOF, variação cambial).</li>
            <li>Despesas anuais ou eventuais (IPTU, IPVA, dedetização) são fixas; para planejamento use a média mensal do ano, que dilui esses lançamentos.</li>
          </ul>
          <ContasExcluidas contas={naoFixas} />
        </CardContent>
      </Card>
    </div>
  );
}
