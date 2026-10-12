import { Topbar } from "@/components/layout/topbar";
import { CabecalhoApresentacao, hojeExtenso } from "@/components/apresentacao/cabecalho";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContratosExportacao, getExportDashboard } from "@/lib/hedge-data";
import { statusLabels, statusOrder } from "@/lib/contrato-shared";
import { formatCurrency, formatDate } from "@/lib/format";

const sacas = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} sc`;

export default async function ApresentacaoExportacaoPage() {
  const [contratos, dashboard] = await Promise.all([getContratosExportacao(), getExportDashboard()]);
  const abertos = contratos.filter((c) => !c.contratoFinalizado);
  const sacasAbertas = abertos.reduce((s, c) => s + (c.quantSacas ?? 0), 0);
  const usdAberto = abertos.reduce((s, c) => s + (c.valorUsd || 0), 0);
  const aReceberRts = contratos.reduce((s, c) => s + (c.saldoAReceberRtsUsd || 0), 0);

  const porEtapa = statusOrder
    .map((status) => ({ etapa: statusLabels[status], contratos: abertos.filter((c) => c.status === status).length }))
    .filter((e) => e.contratos > 0);

  const porPais = Object.values(
    abertos.reduce<Record<string, { pais: string; contratos: number; sacas: number; usd: number }>>((acc, c) => {
      const pais = c.country || "Sem país";
      acc[pais] ??= { pais, contratos: 0, sacas: 0, usd: 0 };
      acc[pais].contratos += 1;
      acc[pais].sacas += c.quantSacas ?? 0;
      acc[pais].usd += c.valorUsd || 0;
      return acc;
    }, {})
  ).sort((a, b) => b.usd - a.usd);

  const cards = [
    { t: "Contratos em andamento", v: String(dashboard.emAndamento) },
    { t: "Contratos concluídos", v: String(dashboard.concluidos) },
    { t: "Prazos vencidos", v: String(dashboard.prazosVencidos), alerta: dashboard.prazosVencidos > 0 },
    { t: "Sacas em andamento", v: sacas(sacasAbertas) },
    { t: "Valor em andamento", v: formatCurrency(usdAberto, "USD") },
    { t: "A receber (RTS)", v: formatCurrency(aReceberRts, "USD") },
  ];

  return (
    <div className="flex flex-col">
      <Topbar title="Apresentação" subtitle="Controle de Exportação - visão executiva" />
      <div className="space-y-6 p-6">
        <CabecalhoApresentacao titulo="Controle de Exportação" referencia={`Posição em ${hojeExtenso()}`} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <Card key={c.t}>
              <CardContent className="space-y-1 p-4">
                <p className="text-xs text-muted">{c.t}</p>
                <p className={c.alerta ? "text-xl font-semibold text-danger" : "text-xl font-semibold"}>{c.v}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {porEtapa.length > 0 && (
          <BarChartCard
            title="Contratos em andamento por etapa"
            data={porEtapa}
            xKey="etapa"
            series={[{ key: "contratos", name: "Contratos", color: "#1c8388" }]}
            height={320}
          />
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Em andamento por país de destino</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="py-2 text-left font-medium">País</th>
                    <th className="py-2 text-right font-medium">Contratos</th>
                    <th className="py-2 text-right font-medium">Sacas</th>
                    <th className="py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {porPais.map((p) => (
                    <tr key={p.pais} className="border-b border-border/50">
                      <td className="py-1.5">{p.pais}</td>
                      <td className="py-1.5 text-right tabular-nums">{p.contratos}</td>
                      <td className="py-1.5 text-right tabular-nums">{sacas(p.sacas)}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatCurrency(p.usd, "USD")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prazos vencidos mais antigos</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.prazosCriticos.length === 0 ? (
                <p className="text-sm text-muted">Nenhum prazo vencido.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {dashboard.prazosCriticos.map((p) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-1.5 font-medium">{p.contractNumber}</td>
                        <td className="py-1.5">{p.clienteName}</td>
                        <td className="py-1.5 text-right">{p.data ? formatDate(p.data) : "-"}</td>
                        <td className="py-1.5 text-right text-danger">{p.diasAtraso} dias</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
