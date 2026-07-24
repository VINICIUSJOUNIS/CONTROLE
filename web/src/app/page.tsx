import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PieChartCard } from "@/components/charts/pie-chart-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  banks,
  cashFlow,
  getBank,
  kpis,
  loans,
  rateHistory,
} from "@/lib/mock-data";
import { formatCompactCurrency, formatDate, formatMonthLabel } from "@/lib/format";
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, CalendarClock, PiggyBank } from "lucide-react";

export default function DashboardPage() {
  const debtEvolution = rateHistory.map((r, i) => ({
    month: formatMonthLabel(r.month),
    saldoDevedor: Math.round(kpis.totalContratado * (0.55 + Math.sin(i / 5) * 0.06 + i * 0.004)),
  }));

  const cashFlowData = cashFlow.map((c) => ({
    month: formatMonthLabel(c.month),
    entradas: c.entradas,
    saidas: c.saidas,
  }));

  const byBank = banks
    .map((b) => ({
      name: b.name,
      value: loans.filter((l) => l.bankId === b.id).reduce((s, l) => s + l.contractedValue, 0),
      color: b.color,
    }))
    .filter((b) => b.value > 0);

  const modalityDistribution = [
    { name: "Emprestimos", value: kpis.totalContratado, color: "#155eef" },
    { name: "ACC", value: kpis.totalAccContratado, color: "#12b76a" },
  ];

  const upcoming = [...loans]
    .filter((l) => l.status !== "Liquidado")
    .sort((a, b) => a.lastDueDate.localeCompare(b.lastDueDate))
    .slice(0, 6);

  return (
    <div className="flex flex-col">
      <Topbar
        title="Dashboard Executivo"
        subtitle="Visao geral da carteira de emprestimos e ACC"
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <KpiCard
            label="Saldo devedor total"
            value={formatCompactCurrency(kpis.saldoDevedorTotal)}
            icon={Wallet}
            trend="4,2%"
            trendLabel="vs mes anterior"
            trendPositive={false}
          />
          <KpiCard
            label="Total contratado"
            value={formatCompactCurrency(kpis.totalContratado)}
            icon={PiggyBank}
          />
          <KpiCard
            label="Juros pagos"
            value={formatCompactCurrency(kpis.jurosPagos)}
            icon={TrendingDown}
          />
          <KpiCard
            label="Juros futuros"
            value={formatCompactCurrency(kpis.jurosFuturos)}
            icon={TrendingUp}
          />
          <KpiCard
            label="Operacoes ativas"
            value={String(kpis.operacoesAtivas)}
            icon={PiggyBank}
          />
          <KpiCard
            label="Operacoes em atraso"
            value={String(kpis.operacoesAtraso)}
            icon={AlertTriangle}
            trendPositive={false}
          />
          <KpiCard
            label="Exposicao cambial (ACC aberto)"
            value={formatCompactCurrency(kpis.exposicaoCambial)}
            icon={TrendingUp}
          />
          <KpiCard
            label="Proximo vencimento"
            value={upcoming[0] ? formatDate(upcoming[0].lastDueDate) : "-"}
            icon={CalendarClock}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BarChartCard
              title="Fluxo de pagamentos - proximos 12 meses"
              data={cashFlowData}
              xKey="month"
              series={[
                { key: "entradas", name: "Entradas", color: "#12b76a" },
                { key: "saidas", name: "Saidas", color: "#f04438" },
              ]}
              valueFormat="currency"
            />
          </div>
          <PieChartCard title="Distribuicao por modalidade" data={modalityDistribution} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LineChartCard
              title="Evolucao da divida"
              data={debtEvolution}
              xKey="month"
              series={[{ key: "saldoDevedor", name: "Saldo devedor", color: "#155eef" }]}
              valueFormat="currency"
            />
          </div>
          <PieChartCard title="Distribuicao por banco (emprestimos)" data={byBank} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Proximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Contrato</th>
                  <th className="pb-2 font-medium">Banco</th>
                  <th className="pb-2 font-medium">Valor contratado</th>
                  <th className="pb-2 font-medium">Vencimento</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((loan) => (
                  <tr key={loan.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium">{loan.contractNumber}</td>
                    <td className="py-2.5">{getBank(loan.bankId).name}</td>
                    <td className="py-2.5">{formatCompactCurrency(loan.contractedValue)}</td>
                    <td className="py-2.5">{formatDate(loan.lastDueDate)}</td>
                    <td className="py-2.5">
                      <Badge variant={loan.status === "Em atraso" ? "danger" : "success"}>
                        {loan.status}
                      </Badge>
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
