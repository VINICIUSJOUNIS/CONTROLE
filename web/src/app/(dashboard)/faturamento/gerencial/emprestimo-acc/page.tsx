import { Topbar } from "@/components/layout/topbar";
import { EmprestimosAccKpis } from "@/components/dashboard/emprestimos-acc-kpis";
import { GerencialFilter } from "@/components/faturamento/gerencial-filter";
import { PrintButton } from "@/components/faturamento/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailableYears, getEmprestimoAccComparativoAnual, getEmprestimoAccContratacaoMensal } from "@/lib/data";
import { periodLabel } from "@/lib/gerencial-shared";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";

const COMPARATIVO_YEARS = ["2023", "2024", "2025", "2026"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function pct(value: number | null) {
  return value === null ? "-" : formatPercent(value);
}

export default async function ApresentacaoEmprestimoAccPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; day?: string }>;
}) {
  const { year = "", month = "", day = "" } = await searchParams;
  // Sem ano no filtro, a contratacao mensal mostra o ano corrente.
  const anoMensal = year || String(new Date().getFullYear());
  const [years, comparativoAnual, contratacaoMensal] = await Promise.all([
    getAvailableYears(),
    getEmprestimoAccComparativoAnual(COMPARATIVO_YEARS),
    getEmprestimoAccContratacaoMensal(anoMensal),
  ]);
  const totalMensal = contratacaoMensal.reduce(
    (s, m) => ({ emprestimos: s.emprestimos + m.emprestimos, acc: s.acc + m.acc, total: s.total + m.total }),
    { emprestimos: 0, acc: 0, total: 0 }
  );

  // getKpis filtra por mes (contractDate no formato YYYY-MM) - o dia do filtro
  // nao se aplica aqui (nao faz sentido cortar a carteira por dia exato), so
  // ano e mes.
  const range = year ? { from: `${year}-${month || "01"}`, to: `${year}-${month || "12"}` } : undefined;

  return (
    <div className="flex flex-col">
      <Topbar title="Emprestimo e ACC" />
      <div className="space-y-6 p-6">
        <div className="print:hidden">
          <GerencialFilter years={years} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{periodLabel(year, month, day)}</p>
          <PrintButton />
        </div>

        <EmprestimosAccKpis range={range} compact />

        <Card>
          <CardHeader>
            <CardTitle>Valor Contratado por Mês — {anoMensal}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-center text-xs text-muted">
                  <th className="px-4 py-2.5 text-left font-medium">Mês</th>
                  <th className="px-4 py-2.5 text-right font-medium">Empréstimos (R$)</th>
                  <th className="px-4 py-2.5 text-right font-medium">ACC (R$)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total Contratado (R$)</th>
                </tr>
              </thead>
              <tbody>
                {contratacaoMensal.map((m, i) => (
                  <tr key={m.mes} className={`border-b border-border ${month && Number(month) === i + 1 ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2.5 font-medium">{MESES[i]}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.emprestimos ? formatCurrency(m.emprestimos) : "-"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.acc ? formatCurrency(m.acc) : "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{m.total ? formatCurrency(m.total) : "-"}</td>
                  </tr>
                ))}
                <tr className="bg-border/30 font-semibold">
                  <td className="px-4 py-2.5">Total {anoMensal}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totalMensal.emprestimos)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totalMensal.acc)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(totalMensal.total)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

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
