import { Topbar } from "@/components/layout/topbar";
import { CabecalhoApresentacao } from "@/components/apresentacao/cabecalho";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getBudgetPlan, getBudgetYears } from "@/lib/budget-data";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function ApresentacaoPlanejamentoPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const params = await searchParams;
  const years = await getBudgetYears();
  const year = params.year ? Number(params.year) : (years[0] ?? new Date().getFullYear());
  const plan = await getBudgetPlan(year);

  if (!plan) {
    return (
      <div className="flex flex-col">
        <Topbar title="Apresentação" subtitle="Planejamento Orçamentário - visão executiva" />
        <p className="p-6 text-sm text-muted">Nenhum plano orçamentário cadastrado para {year}.</p>
      </div>
    );
  }

  // Meses com realizado lancado: base justa para comparar previsto x realizado ate agora.
  const mesesRealizados = plan.months.filter((m) => m.receitaRealizada !== 0 || m.despesaRealizada !== 0);
  const previstoAteAgora = {
    receita: mesesRealizados.reduce((s, m) => s + m.receitaPrevista, 0),
    despesa: mesesRealizados.reduce((s, m) => s + m.despesaPrevista, 0),
    resultado: mesesRealizados.reduce((s, m) => s + m.resultadoPrevisto, 0),
  };
  const ating = (real: number, prev: number) => (prev !== 0 ? (real / prev) * 100 : null);
  const t = plan.totais;

  const cards = [
    { t: "Receita prevista no ano", v: formatCurrency(t.receitaPrevista) },
    { t: "Receita realizada", v: formatCurrency(t.receitaRealizada), s: ating(t.receitaRealizada, previstoAteAgora.receita) },
    { t: "Despesa realizada", v: formatCurrency(t.despesaRealizada), s: ating(t.despesaRealizada, previstoAteAgora.despesa) },
    { t: "Resultado realizado", v: formatCurrency(t.resultadoRealizado), neg: t.resultadoRealizado < 0 },
    { t: "Resultado previsto no ano", v: formatCurrency(t.resultadoPrevisto), neg: t.resultadoPrevisto < 0 },
    { t: "Ponto de equilíbrio (receita)", v: plan.pontoEquilibrio.valorReais === null ? "-" : formatCurrency(plan.pontoEquilibrio.valorReais) },
  ];

  return (
    <div className="flex flex-col">
      <Topbar title="Apresentação" subtitle="Planejamento Orçamentário - visão executiva" />
      <div className="space-y-6 p-6">
        <CabecalhoApresentacao
          titulo={`Planejamento Orçamentário ${plan.year}`}
          referencia={`${plan.name} · ${mesesRealizados.length} ${mesesRealizados.length === 1 ? "mês realizado" : "meses realizados"}`}
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <Card key={c.t}>
              <CardContent className="space-y-1 p-4">
                <p className="text-xs text-muted">{c.t}</p>
                <p className={cn("text-xl font-semibold", c.neg && "text-danger")}>{c.v}</p>
                {c.s !== undefined && c.s !== null && <p className="text-xs text-muted">{formatPercent(c.s, 1)} do previsto no período</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <BarChartCard
            title="Receita prevista x realizada"
            data={plan.months.map((m) => ({ mes: m.label, previsto: m.receitaPrevista, realizado: m.receitaRealizada }))}
            xKey="mes"
            series={[
              { key: "previsto", name: "Previsto", color: "#9fc3c5" },
              { key: "realizado", name: "Realizado", color: "#1c8388" },
            ]}
            valueFormat="currency"
          />
          <LineChartCard
            title="Resultado previsto x realizado"
            data={plan.months.map((m) => ({ mes: m.label, previsto: m.resultadoPrevisto, realizado: m.resultadoRealizado }))}
            xKey="mes"
            series={[
              { key: "previsto", name: "Previsto", color: "#9fc3c5" },
              { key: "realizado", name: "Realizado", color: "#12b76a" },
            ]}
            valueFormat="currency"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Despesas por grupo - previsto x realizado</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="py-2 text-left font-medium">Grupo</th>
                  <th className="py-2 text-right font-medium">Previsto no ano</th>
                  <th className="py-2 text-right font-medium">Realizado</th>
                  <th className="py-2 text-right font-medium">% do previsto anual</th>
                </tr>
              </thead>
              <tbody>
                {plan.groups
                  .filter((g) => g.totalPrevisto !== 0 || g.totalRealizado !== 0)
                  .map((g) => (
                    <tr key={g.group} className="border-b border-border/50">
                      <td className="py-1.5">{g.label}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatCurrency(g.totalPrevisto)}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatCurrency(g.totalRealizado)}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {g.totalPrevisto !== 0 ? formatPercent((g.totalRealizado / g.totalPrevisto) * 100, 1) : "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
