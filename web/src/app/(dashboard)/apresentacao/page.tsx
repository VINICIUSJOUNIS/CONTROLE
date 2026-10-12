import { Topbar } from "@/components/layout/topbar";
import { CabecalhoApresentacao, hojeExtenso } from "@/components/apresentacao/cabecalho";
import { EmprestimosAccKpis } from "@/components/dashboard/emprestimos-acc-kpis";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { getCashFlow, getDebtEvolution, getYearlyComparison } from "@/lib/data";
import { formatMonthLabel } from "@/lib/format";

export default async function ApresentacaoEmprestimosPage() {
  const [cashFlow, debtEvolution, yearly] = await Promise.all([getCashFlow(), getDebtEvolution(), getYearlyComparison()]);

  return (
    <div className="flex flex-col">
      <Topbar title="Apresentação" subtitle="Controle de Empréstimos - visão executiva" />
      <div className="space-y-6 p-6">
        <CabecalhoApresentacao titulo="Empréstimos e ACC" referencia={`Posição em ${hojeExtenso()}`} />
        <EmprestimosAccKpis compact />
        <div className="grid gap-4 xl:grid-cols-2">
          <LineChartCard
            title="Evolução da dívida"
            data={debtEvolution.map((d) => ({ month: formatMonthLabel(d.month), saldoDevedor: d.saldoDevedor }))}
            xKey="month"
            series={[{ key: "saldoDevedor", name: "Saldo devedor", color: "#1c8388" }]}
            valueFormat="currency"
          />
          <BarChartCard
            title="Fluxo de pagamentos - próximos 12 meses"
            data={cashFlow.map((c) => ({ month: formatMonthLabel(c.month), entradas: c.entradas, saidas: c.saidas }))}
            xKey="month"
            series={[
              { key: "entradas", name: "Entradas", color: "#12b76a" },
              { key: "saidas", name: "Saídas", color: "#f04438" },
            ]}
            valueFormat="currency"
          />
        </div>
        <BarChartCard
          title="Total captado por ano"
          data={yearly}
          xKey="year"
          series={[{ key: "totalCaptado", name: "Total captado", color: "#7a5af8" }]}
          valueFormat="currency"
        />
      </div>
    </div>
  );
}
