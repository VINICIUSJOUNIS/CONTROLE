import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelector } from "@/components/credito/period-selector";
import { prisma } from "@/lib/prisma";
import { statementRecordToInput } from "@/lib/financial/convert";
import { previousStatement } from "@/lib/financial/indicators";
import { fluxoCaixaEbitda, type FluxoCaixaLinha } from "@/lib/financial/cashflow";
import { formatBRL, cn } from "@/lib/utils";

function Linha({ label, valor, bold = false }: { label: string; valor: number; bold?: boolean }) {
  return (
    <tr className={cn("border-b border-border/60", bold && "border-t-2 border-t-border font-semibold")}>
      <td className={cn("px-4 py-2", !bold && "pl-6 text-muted")}>{label}</td>
      <td
        className={cn(
          "px-4 py-2 text-right [font-variant-numeric:tabular-nums]",
          !bold && (valor >= 0 ? "text-success" : "text-danger")
        )}
      >
        {formatBRL(valor)}
      </td>
    </tr>
  );
}

function Secao({ titulo, linhas, total }: { titulo: string; linhas: FluxoCaixaLinha[]; total: number }) {
  return (
    <tbody>
      <tr>
        <td colSpan={2} className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {titulo}
        </td>
      </tr>
      {linhas.map((l) => (
        <Linha key={l.label} label={l.label} valor={l.valor} />
      ))}
      <Linha label={`Total ${titulo}`} valor={total} bold />
    </tbody>
  );
}

export default async function FluxoDeCaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const records = await prisma.financialStatement.findMany({ orderBy: { referenceDate: "asc" } });

  if (records.length === 0) {
    return (
      <>
        <Topbar title="Fluxo de Caixa (via EBITDA)" />
        <div className="p-6">
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted">
              Nenhum balancete lançado ainda.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const statements = records.map(statementRecordToInput);
  const selected = (period && records.find((r) => r.id === period)) || records[records.length - 1];
  const selectedIndex = records.findIndex((r) => r.id === selected.id);
  const statement = statements[selectedIndex];
  const anterior = previousStatement(statement, statements);

  return (
    <>
      <Topbar title="Fluxo de Caixa (via EBITDA)" subtitle={statement.periodLabel} />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PeriodSelector
            periods={records.map((r) => ({ id: r.id, periodLabel: r.periodLabel }))}
            selectedId={selected.id}
          />
        </div>

        {!anterior ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted">
              O Fluxo de Caixa precisa de um período anterior lançado para calcular a variação de capital de
              giro. Lance mais um balancete (de um período anterior a {statement.periodLabel}) para ver esta
              página.
            </CardContent>
          </Card>
        ) : (
          (() => {
            const dfc = fluxoCaixaEbitda(statement, anterior);
            return (
              <>
                <p className="text-xs text-muted">
                  Variação entre {anterior.periodLabel} e {statement.periodLabel}
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted">Geração Interna de Caixa</p>
                      <p className="mt-1.5 text-2xl font-semibold [font-variant-numeric:tabular-nums]">
                        {formatBRL(dfc.geracaoInternaCaixa)}
                      </p>
                      <p className="mt-1 text-xs text-muted">EBITDA − Imposto de Renda</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted">Fluxo de Caixa Operacional</p>
                      <p className="mt-1.5 text-2xl font-semibold [font-variant-numeric:tabular-nums]">
                        {formatBRL(dfc.fluxoCaixaOperacional)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted">Fluxo de Caixa Gerado</p>
                      <p
                        className={cn(
                          "mt-1.5 text-2xl font-semibold [font-variant-numeric:tabular-nums]",
                          dfc.fluxoCaixaGerado >= 0 ? "text-success" : "text-danger"
                        )}
                      >
                        {formatBRL(dfc.fluxoCaixaGerado)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Demonstração do Fluxo de Caixa</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    <table className="w-full text-sm">
                      <tbody>
                        <Linha label="EBITDA" valor={dfc.ebitda} bold />
                        <Linha label="(-) Imposto de Renda" valor={-dfc.impostoRenda} />
                        <Linha label="Geração Interna de Caixa" valor={dfc.geracaoInternaCaixa} bold />
                        <Linha label="(+/-) Resultado Financeiro (juros, variação cambial)" valor={dfc.resultadoFinanceiro} />
                        <Linha label="(+/-) Resultado Não Operacional e Participações" valor={dfc.outrosItensResultado} />
                      </tbody>
                      <Secao
                        titulo="Variação de Capital de Giro"
                        linhas={dfc.variacaoCapitalGiro}
                        total={dfc.totalVariacaoCapitalGiro}
                      />
                      <tbody>
                        <Linha label="Fluxo de Caixa Operacional" valor={dfc.fluxoCaixaOperacional} bold />
                      </tbody>
                      <Secao
                        titulo="Fluxo de Caixa de Investimento"
                        linhas={dfc.fluxoCaixaInvestimento}
                        total={dfc.totalFluxoCaixaInvestimento}
                      />
                      <Secao
                        titulo="Fluxo de Caixa de Financiamento"
                        linhas={dfc.fluxoCaixaFinanciamento}
                        total={dfc.totalFluxoCaixaFinanciamento}
                      />
                      <tbody>
                        <Linha label="Fluxo de Caixa Gerado" valor={dfc.fluxoCaixaGerado} bold />
                        <Linha label="Caixa Inicial" valor={dfc.caixaInicial} />
                        <Linha label="Caixa Final (calculado)" valor={dfc.caixaFinalCalculado} bold />
                        <Linha label="Caixa Final (balancete)" valor={dfc.caixaFinal} />
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {Math.abs(dfc.caixaFinalCalculado - dfc.caixaFinal) > 1 && (
                  <p className="text-xs text-warning">
                    O caixa final calculado pelo fluxo diverge do caixa final do balancete em{" "}
                    {formatBRL(dfc.caixaFinalCalculado - dfc.caixaFinal)} — normal quando há itens não
                    detalhados no lançamento (ex: distribuição de lucros, aportes de capital).
                  </p>
                )}
              </>
            );
          })()
        )}
      </div>
    </>
  );
}
