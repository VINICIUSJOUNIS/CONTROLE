import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/credito/kpi-card";
import { PeriodSelector } from "@/components/credito/period-selector";
import { RiskPanel } from "@/components/credito/risk-panel";
import { prisma } from "@/lib/prisma";
import { statementRecordToInput } from "@/lib/financial/convert";
import {
  ebitda,
  margemEbitda,
  dividaLiquida,
  capitalDeGiro,
  ncg,
  saldoTesouraria,
  exposicaoCambialLiquida,
  fluxoCaixaProjetado,
  yoyComparison,
  findSamePeriodLastYear,
} from "@/lib/financial/indicators";
import { formatBRL, formatPercent } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;

  const records = await prisma.financialStatement.findMany({
    orderBy: { referenceDate: "asc" },
  });

  if (records.length === 0) {
    return (
      <>
        <Topbar title="Dashboard de Crédito" />
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-sm text-muted">
                Nenhum balancete lançado ainda. Cadastre os valores do balanço/balancete para ver o dashboard.
              </p>
              <Link
                href="/credito/importar"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Novo Balancete
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const statements = records.map(statementRecordToInput);
  const selected =
    (period && records.find((r) => r.id === period)) || records[records.length - 1];
  const selectedIndex = records.findIndex((r) => r.id === selected.id);
  const statement = statements[selectedIndex];

  const historicoAteAqui = statements.slice(0, selectedIndex + 1);
  const anterior = findSamePeriodLastYear(statement, statements);
  const yoy = anterior ? yoyComparison(statement, anterior) : null;
  const fluxo = fluxoCaixaProjetado(historicoAteAqui);
  const exposicao = exposicaoCambialLiquida(statement);

  const aiInsights = selected.aiInsights as { riscos?: string[]; geradoEm?: string } | null;

  return (
    <>
      <Topbar title="Dashboard de Crédito" subtitle={statement.periodLabel} />
      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <PeriodSelector
            periods={records.map((r) => ({ id: r.id, periodLabel: r.periodLabel }))}
            selectedId={selected.id}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Receita Líquida"
            value={formatBRL(statement.receitaLiquida)}
            variacaoPct={yoy?.receita.variacaoPct}
            tone="teal"
          />
          <KpiCard
            title="EBITDA"
            value={formatBRL(ebitda(statement))}
            hint={`Margem ${formatPercent((margemEbitda(statement) ?? 0) * 100)}`}
            variacaoPct={yoy?.ebitda.variacaoPct}
            tone="green"
          />
          <KpiCard
            title="Lucro Líquido"
            value={formatBRL(statement.lucroLiquido)}
            variacaoPct={yoy?.lucroLiquido.variacaoPct}
            tone="soft"
          />
          <KpiCard title="Caixa Disponível" value={formatBRL(statement.caixaEquivalentes)} tone="teal" />
          <KpiCard title="Dívida Líquida" value={formatBRL(dividaLiquida(statement))} tone="green" />
          <KpiCard title="Capital de Giro (CCL)" value={formatBRL(capitalDeGiro(statement))} tone="soft" />
          <KpiCard
            title="Necessidade de Capital de Giro (NCG)"
            value={formatBRL(ncg(statement))}
            tone="teal"
          />
          <KpiCard
            title="Saldo de Tesouraria"
            value={formatBRL(saldoTesouraria(statement))}
            hint={saldoTesouraria(statement) < 0 ? "Dependência de capital de terceiros de curto prazo" : undefined}
            tone="green"
          />
          <KpiCard
            title="Fluxo de Caixa Projetado"
            value={fluxo.estimativa != null ? formatBRL(fluxo.estimativa) : ""}
            hint="Estimativa por tendência histórica, não extraída do PDF"
            disponivel={fluxo.disponivel}
            tone="soft"
          />
          <KpiCard
            title="Exposição Cambial Líquida"
            value={exposicao != null ? formatBRL(exposicao) : ""}
            hint="Estimada a partir do balanço, quando discriminado"
            disponivel={exposicao != null}
            tone="teal"
          />
        </div>

        <RiskPanel
          statementId={selected.id}
          riscos={aiInsights?.riscos ?? []}
          geradoEm={aiInsights?.geradoEm ?? null}
        />
      </div>
    </>
  );
}
