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

// Variacao sobre o ano anterior, exibida abaixo do valor. "valor" = variacao
// percentual (R$); "taxa" = diferenca em pontos percentuais (taxas e spread -
// comparar taxa com taxa em % relativo distorce: 10,37% -> 8,00% e -2,37 p.p.,
// nao -22,9%). `subirEBom` define a cor: custo/taxa/spread subindo = vermelho;
// creditos tomados nao tem "bom" ou "ruim" (cor neutra).
function Variacao({
  atual,
  anterior,
  tipo,
  subirEBom,
}: {
  atual: number | null;
  anterior: number | null | undefined;
  tipo: "valor" | "taxa";
  subirEBom?: boolean;
}) {
  if (atual === null || anterior === null || anterior === undefined) return null;
  if (tipo === "valor" && anterior === 0) return null;
  // Taxa: diferenca entre os valores como aparecem na tabela (2 casas) - o
  // spread vem com 4 casas e a conta crua nao bateria com o que se le
  // (0,6114 -> 0,4463 daria -0,17 p.p.; na tela, 0,61% -> 0,45% = -0,16 p.p.).
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const delta = tipo === "valor" ? ((atual - anterior) / Math.abs(anterior)) * 100 : r2(atual) - r2(anterior);
  const d = Number(delta.toFixed(2));
  const texto =
    (d > 0 ? "+" : "") +
    d.toLocaleString("pt-BR", { minimumFractionDigits: tipo === "valor" ? 1 : 2, maximumFractionDigits: tipo === "valor" ? 1 : 2 }) +
    (tipo === "valor" ? "%" : " p.p.");
  const seta = d > 0 ? "▲" : d < 0 ? "▼" : "■";
  const cor =
    d === 0 || subirEBom === undefined
      ? "text-muted"
      : (d > 0) === subirEBom
        ? "text-success"
        : "text-danger";
  return (
    <span className={`mt-0.5 block text-[11px] font-medium ${cor}`}>
      {seta} {texto}
    </span>
  );
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
      <Topbar title="Empréstimo e ACC" />
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
                  {comparativoAnual.map((row, i) => {
                    const ant = i > 0 ? comparativoAnual[i - 1] : undefined;
                    return (
                      <tr key={row.year} className="border-b border-border text-center align-top last:border-0">
                        <td className="px-4 py-2.5 font-medium">{row.year}</td>
                        <td className="px-4 py-2.5">
                          {formatCompactCurrency(row.totalCaptado)}
                          <Variacao atual={row.totalCaptado} anterior={ant?.totalCaptado} tipo="valor" />
                        </td>
                        <td className="px-4 py-2.5">
                          {formatCompactCurrency(row.custoTotal)}
                          <Variacao atual={row.custoTotal} anterior={ant?.custoTotal} tipo="valor" subirEBom={false} />
                        </td>
                        <td className="px-4 py-2.5">
                          {pct(row.custoMedioPonderado)}
                          <Variacao atual={row.custoMedioPonderado} anterior={ant?.custoMedioPonderado} tipo="taxa" subirEBom={false} />
                        </td>
                        <td className="px-4 py-2.5">
                          {pct(row.loanAvgRate)}
                          <Variacao atual={row.loanAvgRate} anterior={ant?.loanAvgRate} tipo="taxa" subirEBom={false} />
                        </td>
                        <td className="px-4 py-2.5">
                          {pct(row.accAvgRate)}
                          <Variacao atual={row.accAvgRate} anterior={ant?.accAvgRate} tipo="taxa" subirEBom={false} />
                        </td>
                        <td className="px-4 py-2.5">
                          {pct(row.taxaMediaPonderada)}
                          <Variacao atual={row.taxaMediaPonderada} anterior={ant?.taxaMediaPonderada} tipo="taxa" subirEBom={false} />
                        </td>
                        <td className="px-4 py-2.5">
                          {pct(row.spreadMedio)}
                          <Variacao atual={row.spreadMedio} anterior={ant?.spreadMedio} tipo="taxa" subirEBom={false} />
                        </td>
                        <td className="px-4 py-2.5">
                          {formatCompactCurrency(row.valorSpread)}
                          <Variacao atual={row.valorSpread} anterior={ant?.valorSpread} tipo="valor" subirEBom={false} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-4 pb-3 pt-2 text-[11px] text-muted">
                Abaixo de cada valor: variação sobre o ano anterior. Valores em R$ em %; taxas e spread em pontos percentuais
                (p.p.). Verde = melhora (custo, taxa ou spread menor), vermelho = piora. {COMPARATIVO_YEARS[COMPARATIVO_YEARS.length - 1]}{" "}
                considera os contratos tomados até hoje.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
