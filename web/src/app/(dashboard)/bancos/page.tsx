import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { NovoBanco } from "@/components/bancos/novo-banco";
import { DeleteBankButton } from "@/components/bancos/delete-bank-button";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { getAvailableYears, getBankComparison } from "@/lib/data";
import { formatCompactCurrency, formatPercent } from "@/lib/format";
import { Trophy } from "lucide-react";

export default async function BancosPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = params.from || params.to ? { from: params.from, to: params.to } : undefined;

  const [bankComparison, years] = await Promise.all([getBankComparison(range), getAvailableYears()]);
  const withOps = bankComparison.filter((b) => b.qtdAcc > 0);

  const sortedByRate = [...withOps].sort((a, b) => a.taxaMedia - b.taxaMedia);
  const sortedByVolume = [...withOps].sort((a, b) => b.valorCaptado - a.valorCaptado);
  const sortedBySpread = [...withOps].sort((a, b) => a.spreadMedio - b.spreadMedio);

  const rankings = [
    sortedByRate[0] && {
      label: "Menor taxa media",
      bank: sortedByRate[0],
      value: formatPercent(sortedByRate[0].taxaMedia),
    },
    sortedByVolume[0] && {
      label: "Maior volume captado",
      bank: sortedByVolume[0],
      value: formatCompactCurrency(sortedByVolume[0].valorCaptado),
    },
    sortedBySpread[0] && {
      label: "Menor spread medio",
      bank: sortedBySpread[0],
      value: formatPercent(sortedBySpread[0].spreadMedio, 4),
    },
  ].filter((r): r is { label: string; bank: (typeof withOps)[number]; value: string } => Boolean(r));

  const chartData = withOps.map((b) => ({
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
        <PeriodFilter years={years} />

        <div className="flex justify-end">
          <NovoBanco />
        </div>

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
            { key: "taxaMedia", name: "Taxa media (%)", color: "#1c8388" },
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
                  <th className="pb-2 pr-4 font-medium">Custo medio</th>
                  <th className="pb-2 font-medium"></th>
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
                    <td className="py-2.5 pr-4">{formatPercent(b.custoMedio)}</td>
                    <td className="py-2.5">
                      <DeleteBankButton id={b.bankId} name={b.bankName} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparativo de custos totais entre bancos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 pr-4 font-medium">Banco</th>
                  <th className="pb-2 pr-4 font-medium">Spread</th>
                  <th className="pb-2 pr-4 font-medium">Juros pagos</th>
                  <th className="pb-2 pr-4 font-medium">IOF</th>
                  <th className="pb-2 pr-4 font-medium">Tarifas</th>
                  <th className="pb-2 pr-4 font-medium">Seguro</th>
                  <th className="pb-2 pr-4 font-medium">Outros custos</th>
                  <th className="pb-2 font-medium">Custo total geral</th>
                </tr>
              </thead>
              <tbody>
                {[...bankComparison]
                  .sort((a, b) => b.custoTotalGeral - a.custoTotalGeral)
                  .map((b) => (
                    <tr key={b.bankId} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{b.bankName}</td>
                      <td className="py-2.5 pr-4">{formatCompactCurrency(b.totalSpread)}</td>
                      <td className="py-2.5 pr-4">{formatCompactCurrency(b.totalJuros)}</td>
                      <td className="py-2.5 pr-4">{formatCompactCurrency(b.totalIOF)}</td>
                      <td className="py-2.5 pr-4">{formatCompactCurrency(b.totalTarifas)}</td>
                      <td className="py-2.5 pr-4">{formatCompactCurrency(b.totalSeguro)}</td>
                      <td className="py-2.5 pr-4">{formatCompactCurrency(b.totalOutrosCustos)}</td>
                      <td className="py-2.5 font-semibold">{formatCompactCurrency(b.custoTotalGeral)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              Custo total geral = spread + juros pagos + IOF + tarifas + seguro + outros custos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
