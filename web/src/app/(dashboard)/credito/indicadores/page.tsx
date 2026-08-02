import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/credito/trend-chart";
import { prisma } from "@/lib/prisma";
import { statementRecordToInput } from "@/lib/financial/convert";
import {
  ebitda,
  margemEbitda,
  cicloFinanceiro,
  pmrDias,
  pmeDias,
  pmpDias,
  capitalDeGiro,
  ncg,
  saldoTesouraria,
} from "@/lib/financial/indicators";
import { formatBRL, formatPercent, formatDays } from "@/lib/utils";

export default async function IndicadoresPage() {
  const records = await prisma.financialStatement.findMany({
    orderBy: { referenceDate: "asc" },
  });

  if (records.length === 0) {
    return (
      <>
        <Topbar title="Indicadores" />
        <div className="p-6">
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted">
              Nenhum balancete importado ainda.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const statements = records.map(statementRecordToInput);

  const rentabilidadeData = statements.map((s) => ({
    periodLabel: s.periodLabel,
    ebitda: ebitda(s),
    lucroLiquido: s.lucroLiquido,
    margemEbitdaPct: (margemEbitda(s) ?? 0) * 100,
  }));

  const cicloData = statements.map((s) => ({
    periodLabel: s.periodLabel,
    pmr: pmrDias(s),
    pme: pmeDias(s),
    pmp: pmpDias(s),
    cicloFinanceiro: cicloFinanceiro(s),
  }));

  const estruturaData = statements.map((s) => ({
    periodLabel: s.periodLabel,
    ccl: capitalDeGiro(s),
    ncg: ncg(s),
    saldoTesouraria: saldoTesouraria(s),
  }));

  return (
    <>
      <Topbar title="Indicadores" subtitle="Evolução dos indicadores ao longo dos períodos importados" />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>EBITDA e Lucro Líquido</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={rentabilidadeData}
              format="currency"
              series={[
                { key: "ebitda", label: "EBITDA", color: "var(--color-primary)" },
                { key: "lucroLiquido", label: "Lucro Líquido", color: "var(--color-success)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Margem EBITDA (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={rentabilidadeData}
              format="percent"
              series={[{ key: "margemEbitdaPct", label: "Margem EBITDA", color: "var(--color-warning)" }]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PMR / PME / PMP e Ciclo Financeiro (dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={cicloData}
              format="days"
              series={[
                { key: "pmr", label: "PMR", color: "var(--color-primary)" },
                { key: "pme", label: "PME", color: "var(--color-warning)" },
                { key: "pmp", label: "PMP", color: "var(--color-danger)" },
                { key: "cicloFinanceiro", label: "Ciclo Financeiro", color: "var(--color-success)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capital de Giro: CCL / NCG / Saldo de Tesouraria</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={estruturaData}
              format="currency"
              series={[
                { key: "ccl", label: "CCL", color: "var(--color-primary)" },
                { key: "ncg", label: "NCG", color: "var(--color-warning)" },
                { key: "saldoTesouraria", label: "Saldo de Tesouraria", color: "var(--color-success)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Período</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="py-2 pr-4">Período</th>
                  <th className="py-2 pr-4">EBITDA</th>
                  <th className="py-2 pr-4">Margem EBITDA</th>
                  <th className="py-2 pr-4">Lucro Líquido</th>
                  <th className="py-2 pr-4">PMR</th>
                  <th className="py-2 pr-4">PME</th>
                  <th className="py-2 pr-4">PMP</th>
                  <th className="py-2 pr-4">Ciclo Financeiro</th>
                  <th className="py-2 pr-4">CCL</th>
                  <th className="py-2 pr-4">NCG</th>
                  <th className="py-2 pr-4">Saldo Tesouraria</th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => (
                  <tr key={s.periodLabel} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{s.periodLabel}</td>
                    <td className="py-2 pr-4">{formatBRL(ebitda(s))}</td>
                    <td className="py-2 pr-4">{formatPercent((margemEbitda(s) ?? 0) * 100)}</td>
                    <td className="py-2 pr-4">{formatBRL(s.lucroLiquido)}</td>
                    <td className="py-2 pr-4">{formatDays(pmrDias(s) ?? 0)}</td>
                    <td className="py-2 pr-4">{formatDays(pmeDias(s) ?? 0)}</td>
                    <td className="py-2 pr-4">{formatDays(pmpDias(s) ?? 0)}</td>
                    <td className="py-2 pr-4">{formatDays(cicloFinanceiro(s) ?? 0)}</td>
                    <td className="py-2 pr-4">{formatBRL(capitalDeGiro(s))}</td>
                    <td className="py-2 pr-4">{formatBRL(ncg(s))}</td>
                    <td className="py-2 pr-4">{formatBRL(saldoTesouraria(s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
