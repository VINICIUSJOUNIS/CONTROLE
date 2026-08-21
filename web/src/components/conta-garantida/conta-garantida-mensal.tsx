import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { formatCompactCurrency, formatCurrency, formatMonthLabel } from "@/lib/format";
import { ContaGarantidaMensalRow } from "@/lib/data";
import { Percent, Receipt, ReceiptText, Wallet } from "lucide-react";

export function ContaGarantidaMensal({ data }: { data: ContaGarantidaMensalRow[] }) {
  const totais = data.reduce(
    (acc, m) => ({
      juros: acc.juros + m.juros,
      iof: acc.iof + m.iof,
      iofAdicional: acc.iofAdicional + m.iofAdicional,
      total: acc.total + m.total,
    }),
    { juros: 0, iof: 0, iofAdicional: 0, total: 0 }
  );

  const chartData = data.map((m) => ({
    month: formatMonthLabel(m.month),
    juros: m.juros,
    iof: m.iof,
    iofAdicional: m.iofAdicional,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Juros no Período" value={formatCompactCurrency(totais.juros)} icon={Percent} tone="soft" />
        <KpiCard label="IOF no Período" value={formatCompactCurrency(totais.iof)} icon={Receipt} tone="soft" />
        <KpiCard
          label="IOF Adicional no Período"
          value={formatCompactCurrency(totais.iofAdicional)}
          icon={ReceiptText}
          tone="soft"
        />
        <KpiCard label="Custo Total no Período" value={formatCompactCurrency(totais.total)} icon={Wallet} tone="teal" />
      </div>

      {chartData.length > 0 && (
        <BarChartCard
          title="Custo Mensal da Conta Garantida"
          data={chartData}
          xKey="month"
          stacked
          series={[
            { key: "juros", name: "Juros", color: "#74acb3" },
            { key: "iof", name: "IOF", color: "#f0ad4e" },
            { key: "iofAdicional", name: "IOF Adicional", color: "#12b76a" },
          ]}
          valueFormat="currency"
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Mês</th>
                <th className="px-4 py-3 font-medium">Juros</th>
                <th className="px-4 py-3 font-medium">IOF</th>
                <th className="px-4 py-3 font-medium">IOF Adicional</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.month} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{formatMonthLabel(m.month)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(m.juros)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(m.iof)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(m.iofAdicional)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(m.total)}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Nenhum custo no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
