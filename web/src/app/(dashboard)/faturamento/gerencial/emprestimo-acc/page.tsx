import { Topbar } from "@/components/layout/topbar";
import { EmprestimosAccKpis } from "@/components/dashboard/emprestimos-acc-kpis";
import { GerencialFilter } from "@/components/faturamento/gerencial-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailableYears, getEmprestimoAccComparativoAnual } from "@/lib/data";
import { periodLabel } from "@/lib/gerencial-shared";
import { formatCompactCurrency, formatPercent } from "@/lib/format";

const COMPARATIVO_YEARS = ["2023", "2024", "2025", "2026"];

function pct(value: number | null) {
  return value === null ? "-" : formatPercent(value);
}

export default async function ApresentacaoEmprestimoAccPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
}) {
  const { year = "", month = "", day = "" } = await searchParams;
  const [years, comparativoAnual] = await Promise.all([
    getAvailableYears(),
    getEmprestimoAccComparativoAnual(COMPARATIVO_YEARS),
  ]);

  // getKpis filtra por mes (contractDate no formato YYYY-MM) - o dia do filtro
  // nao se aplica aqui (nao faz sentido cortar a carteira por dia exato), so
  // ano e mes.
  const range = year ? { from: `${year}-${month || "01"}`, to: `${year}-${month || "12"}` } : undefined;

  return (
    <div className="flex flex-col">
      <Topbar title="Emprestimo e ACC" />
      <div className="space-y-6 p-6">
        <GerencialFilter years={years} />

        <p className="text-sm text-muted">{periodLabel(year, month, day)}</p>

        <EmprestimosAccKpis range={range} compact />

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Comparativo por Ano — {COMPARATIVO_YEARS[0]} a {COMPARATIVO_YEARS[COMPARATIVO_YEARS.length - 1]}
          </h2>

          <Card>
            <CardHeader>
              <CardTitle>Créditos Tomados x Valores Quitados</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-center text-xs text-muted">
                    <th className="px-4 py-2.5 font-medium">Ano</th>
                    <th className="px-4 py-2.5 font-medium">Créditos Tomados (R$)</th>
                    <th className="px-4 py-2.5 font-medium">Custo Total (R$)</th>
                    <th className="px-4 py-2.5 font-medium">Custo Médio Ponderado</th>
                    <th className="px-4 py-2.5 font-medium">Taxa Empréstimos</th>
                    <th className="px-4 py-2.5 font-medium">Taxa ACC</th>
                    <th className="px-4 py-2.5 font-medium">Taxa Média Ponderada</th>
                    <th className="px-4 py-2.5 font-medium">Spread ACC</th>
                    <th className="px-4 py-2.5 font-medium">Valor Pago em Spread (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativoAnual.map((row) => (
                    <tr key={row.year} className="border-b border-border text-center last:border-0">
                      <td className="px-4 py-2.5 font-medium">{row.year}</td>
                      <td className="px-4 py-2.5">{formatCompactCurrency(row.totalCaptado)}</td>
                      <td className="px-4 py-2.5">{formatCompactCurrency(row.custoTotal)}</td>
                      <td className="px-4 py-2.5">{pct(row.custoMedioPonderado)}</td>
                      <td className="px-4 py-2.5">{pct(row.loanAvgRate)}</td>
                      <td className="px-4 py-2.5">{pct(row.accAvgRate)}</td>
                      <td className="px-4 py-2.5">{pct(row.taxaMediaPonderada)}</td>
                      <td className="px-4 py-2.5">{pct(row.spreadMedio)}</td>
                      <td className="px-4 py-2.5">{formatCompactCurrency(row.valorSpread)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
