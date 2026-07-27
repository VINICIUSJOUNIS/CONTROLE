import { Topbar } from "@/components/layout/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PieChartCard } from "@/components/charts/pie-chart-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAccOperations,
  getAvailableYears,
  getBanks,
  getCashFlow,
  getDebtEvolution,
  getKpis,
  getLoans,
  getYearlyComparison,
} from "@/lib/data";
import { formatCompactCurrency, formatDate, formatMonthLabel, formatPercent } from "@/lib/format";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  PiggyBank,
  Percent,
  PieChart,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  EM_ABERTO: "Em aberto",
  LIQUIDADO: "Liquidado",
  EM_ATRASO: "Em atraso",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = params.from || params.to ? { from: params.from, to: params.to } : undefined;

  const [allLoans, allAccOperations, banks, kpis, cashFlow, debtEvolutionRaw, yearlyComparison, years] =
    await Promise.all([
      getLoans(),
      getAccOperations(),
      getBanks(),
      getKpis(range),
      getCashFlow(range),
      getDebtEvolution(range),
      getYearlyComparison(),
      getAvailableYears(),
    ]);

  const inPeriod = (contractDate: string) => {
    if (range?.from && contractDate.slice(0, 7) < range.from) return false;
    if (range?.to && contractDate.slice(0, 7) > range.to) return false;
    return true;
  };
  const loans = allLoans.filter((l) => inPeriod(l.contractDate));
  const accOperations = allAccOperations.filter((a) => inPeriod(a.contractDate));

  const debtEvolution = debtEvolutionRaw.map((d) => ({
    month: formatMonthLabel(d.month),
    saldoDevedor: d.saldoDevedor,
  }));

  const cashFlowData = cashFlow.map((c) => ({
    month: formatMonthLabel(c.month),
    entradas: c.entradas,
    saidas: c.saidas,
  }));

  const byBank = banks
    .map((b) => ({
      name: b.name,
      value:
        loans.filter((l) => l.bankId === b.id).reduce((s, l) => s + l.contractedValue, 0) +
        accOperations.filter((a) => a.bankId === b.id).reduce((s, a) => s + a.receivedValueBRL, 0),
      color: b.color,
    }))
    .filter((b) => b.value > 0);

  const modalityDistribution = [
    { name: "Emprestimos", value: kpis.totalContratado, color: "#1c8388" },
    { name: "ACC", value: kpis.totalAccContratado, color: "#12b76a" },
  ];

  const upcoming = [
    ...loans
      .filter((l) => l.status !== "LIQUIDADO")
      .map((l) => ({
        id: l.id,
        tipo: "Emprestimo" as const,
        contractNumber: l.contractNumber,
        bankName: l.bankName,
        valor: l.contractedValue,
        vencimento: l.lastDueDate,
        status: l.status,
      })),
    ...accOperations
      .filter((a) => a.status !== "LIQUIDADO")
      .map((a) => ({
        id: a.id,
        tipo: "ACC" as const,
        contractNumber: a.accNumber,
        bankName: a.bankName,
        valor: a.receivedValueBRL,
        vencimento: a.settlementDate,
        status: a.status,
      })),
  ]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 8);

  return (
    <div className="flex flex-col">
      <Topbar
        title="Dashboard Executivo"
        subtitle="Visao geral da carteira de emprestimos e ACC"
      />
      <div className="space-y-6 p-6">
        <PeriodFilter years={years} />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <KpiCard
            label="Saldo devedor total"
            value={formatCompactCurrency(kpis.saldoDevedorTotal)}
            icon={Wallet}
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
            value={upcoming[0] ? formatDate(upcoming[0].vencimento) : "-"}
            icon={CalendarClock}
          />
          <KpiCard
            label="Custo medio ponderado da carteira"
            value={formatPercent(kpis.custoMedioPonderado)}
            icon={Percent}
          />
          <KpiCard
            label="Concentracao no maior banco"
            value={formatPercent(kpis.concentracaoMaiorBanco, 1)}
            icon={PieChart}
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
              series={[{ key: "saldoDevedor", name: "Saldo devedor", color: "#1c8388" }]}
              valueFormat="currency"
            />
          </div>
          <PieChartCard title="Distribuicao por banco" data={byBank} />
        </div>

        {yearlyComparison.length > 1 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Total captado por ano"
              data={yearlyComparison}
              xKey="year"
              series={[{ key: "totalCaptado", name: "Total captado", color: "#7a5af8" }]}
              valueFormat="currency"
            />
            <BarChartCard
              title="Custo medio da carteira por ano"
              data={yearlyComparison}
              xKey="year"
              series={[{ key: "custoMedio", name: "Custo medio (%)", color: "#f04438" }]}
              valueFormat="percent"
            />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Proximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Contrato</th>
                  <th className="pb-2 font-medium">Banco</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Vencimento</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((item) => (
                  <tr key={`${item.tipo}-${item.id}`} className="border-b border-border last:border-0">
                    <td className="py-2.5">
                      <Badge variant="neutral">{item.tipo}</Badge>
                    </td>
                    <td className="py-2.5 font-medium">{item.contractNumber}</td>
                    <td className="py-2.5">{item.bankName}</td>
                    <td className="py-2.5">{formatCompactCurrency(item.valor)}</td>
                    <td className="py-2.5">{formatDate(item.vencimento)}</td>
                    <td className="py-2.5">
                      <Badge variant={item.status === "EM_ATRASO" ? "danger" : "success"}>
                        {statusLabels[item.status] ?? item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {upcoming.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted">
                      Nenhum contrato com vencimento futuro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
