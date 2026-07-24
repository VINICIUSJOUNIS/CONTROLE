import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { bankComparison } from "@/lib/mock-data";
import { formatCompactCurrency, formatPercent } from "@/lib/format";
import { Trophy } from "lucide-react";

export default function BancosPage() {
  const sortedByRate = [...bankComparison].sort((a, b) => a.taxaMedia - b.taxaMedia);
  const sortedByVolume = [...bankComparison].sort((a, b) => b.valorCaptado - a.valorCaptado);
  const sortedBySpread = [...bankComparison].sort((a, b) => a.spreadMedio - b.spreadMedio);

  const rankings = [
    { label: "Menor taxa media", bank: sortedByRate[0], value: formatPercent(sortedByRate[0].taxaMedia) },
    { label: "Maior volume captado", bank: sortedByVolume[0], value: formatCompactCurrency(sortedByVolume[0].valorCaptado) },
    { label: "Menor spread medio", bank: sortedBySpread[0], value: formatPercent(sortedBySpread[0].spreadMedio, 4) },
  ];

  const chartData = bankComparison.map((b) => ({
    name: b.bankName,
    taxaMedia: b.taxaMedia,
    custoMedio: b.custoMedio,
  }));

  return (
    <div className="flex flex-col">
      <Topbar
        title="Comparativo de Bancos"
        subtitle="Compare condicoes, taxas e custo efetivo entre instituicoes financeiras"
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {rankings.map((r) => (
            <Card key={r.label} className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted">
                <Trophy size={14} className="text-warning" />
                {r.label}
              </div>
              <p className="mt-2 text-lg font-semibold">{r.bank.bankName}</p>
              <p className="text-sm text-muted">{r.value}</p>
            </Card>
          ))}
        </div>

        <BarChartCard
          title="Taxa media x Custo medio por banco"
          data={chartData}
          xKey="name"
          series={[
            { key: "taxaMedia", name: "Taxa media (%)", color: "#155eef" },
            { key: "custoMedio", name: "Custo medio (%)", color: "#f04438" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Tabela comparativa</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 pr-4 font-medium">Banco</th>
                  <th className="pb-2 pr-4 font-medium">Qtde ACC</th>
                  <th className="pb-2 pr-4 font-medium">Valor captado</th>
                  <th className="pb-2 pr-4 font-medium">Taxa media</th>
                  <th className="pb-2 pr-4 font-medium">Spread medio</th>
                  <th className="pb-2 pr-4 font-medium">Spot medio</th>
                  <th className="pb-2 pr-4 font-medium">Fechamento medio</th>
                  <th className="pb-2 font-medium">Custo medio</th>
                </tr>
              </thead>
              <tbody>
                {bankComparison.map((b) => (
                  <tr key={b.bankId} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{b.bankName}</td>
                    <td className="py-2.5 pr-4">{b.qtdAcc}</td>
                    <td className="py-2.5 pr-4">{formatCompactCurrency(b.valorCaptado)}</td>
                    <td className="py-2.5 pr-4">{formatPercent(b.taxaMedia)}</td>
                    <td className="py-2.5 pr-4">{formatPercent(b.spreadMedio, 4)}</td>
                    <td className="py-2.5 pr-4">R$ {b.spotMedio.toFixed(4)}</td>
                    <td className="py-2.5 pr-4">R$ {b.fechamentoMedio.toFixed(4)}</td>
                    <td className="py-2.5">{formatPercent(b.custoMedio)}</td>
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
