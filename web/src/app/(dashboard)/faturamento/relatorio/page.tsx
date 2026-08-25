import Image from "next/image";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodComparison } from "@/components/dashboard/period-comparison";
import { MercadoFilter } from "@/components/faturamento/mercado-filter";
import { ComparacaoVendasReport, type ComparisonRow } from "@/components/faturamento/comparacao-vendas-report";
import { getSales, getSaleReturns, type SaleRow, type SaleReturnRow } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";
import { countryLabel } from "@/lib/countries";
import { cn } from "@/lib/utils";

const TOP_CLIENTES = 20;

type ClientAgg = { sacas: number; valueBRL: number; country: string | null };

// Mesma logica de ranqueamento do dashboard de Faturamento (rankClients),
// simplificada para o que o relatorio comparativo precisa mostrar.
function rankClients(rows: SaleRow[], returns: SaleReturnRow[]) {
  const map = new Map<string, ClientAgg>();
  for (const s of rows) {
    const cur = map.get(s.clientName) ?? { sacas: 0, valueBRL: 0, country: s.country };
    cur.sacas += s.quantitySacas;
    cur.valueBRL += s.valueBRL;
    map.set(s.clientName, cur);
  }
  for (const r of returns) {
    const cur = map.get(r.clientName);
    if (!cur) continue;
    cur.sacas -= r.quantitySacas;
    cur.valueBRL -= r.valueBRL;
  }
  return [...map.entries()].sort((a, b) => b[1].valueBRL - a[1].valueBRL);
}


type MarketAgg = { brl: number; sacas: number };
type PeriodAgg = { total: MarketAgg; interno: MarketAgg; externo: MarketAgg };

// Mesma logica de aggregatePeriod do dashboard de Faturamento, mas quebrando o
// resultado por mercado (interno/externo) alem do total, para o relatorio
// comparativo poder mostrar juntos ou separados.
function aggregatePeriodByMarket(
  sales: SaleRow[],
  returns: SaleReturnRow[],
  from: string,
  to: string
): PeriodAgg {
  const inRange = sales.filter((s) => {
    const month = s.saleDate.slice(0, 7);
    return month >= from && month <= to;
  });
  const returnsInRange = returns.filter((r) => {
    const month = r.returnDate.slice(0, 7);
    return month >= from && month <= to;
  });

  function sumFor(clientType: "INTERNO" | "EXTERNO" | null): MarketAgg {
    const s = clientType ? inRange.filter((v) => v.clientType === clientType) : inRange;
    const r = clientType ? returnsInRange.filter((v) => v.clientType === clientType) : returnsInRange;
    return {
      brl: s.reduce((sum, v) => sum + v.valueBRL, 0) - r.reduce((sum, v) => sum + v.valueBRL, 0),
      sacas: s.reduce((sum, v) => sum + v.quantitySacas, 0) - r.reduce((sum, v) => sum + v.quantitySacas, 0),
    };
  }

  return {
    total: sumFor(null),
    interno: sumFor("INTERNO"),
    externo: sumFor("EXTERNO"),
  };
}

export default async function RelatorioVendasPage({
  searchParams,
}: {
  searchParams: Promise<{
    cmpFromA?: string;
    cmpToA?: string;
    cmpFromB?: string;
    cmpToB?: string;
    cmpFromC?: string;
    cmpToC?: string;
    visao?: string;
  }>;
}) {
  const { cmpFromA, cmpToA, cmpFromB, cmpToB, cmpFromC, cmpToC, visao: visaoParam } = await searchParams;
  const visao = visaoParam === "junto" ? "junto" : "separado";

  const [allSales, allReturns] = await Promise.all([getSales(), getSaleReturns()]);

  const comparison =
    cmpFromA && cmpToA && cmpFromB && cmpToB
      ? {
          a: aggregatePeriodByMarket(allSales, allReturns, cmpFromA, cmpToA),
          b: aggregatePeriodByMarket(allSales, allReturns, cmpFromB, cmpToB),
          c: cmpFromC && cmpToC ? aggregatePeriodByMarket(allSales, allReturns, cmpFromC, cmpToC) : null,
        }
      : null;

  // Ranking dos maiores clientes de cada mercado dentro do Periodo A, o
  // periodo de referencia da comparacao.
  const salesA =
    cmpFromA && cmpToA
      ? allSales.filter((s) => {
          const month = s.saleDate.slice(0, 7);
          return month >= cmpFromA && month <= cmpToA;
        })
      : [];
  const returnsA =
    cmpFromA && cmpToA
      ? allReturns.filter((r) => {
          const month = r.returnDate.slice(0, 7);
          return month >= cmpFromA && month <= cmpToA;
        })
      : [];
  const internosA = salesA.filter((s) => s.clientType === "INTERNO");
  const externosA = salesA.filter((s) => s.clientType === "EXTERNO");
  const returnsInternosA = returnsA.filter((r) => r.clientType === "INTERNO");
  const returnsExternosA = returnsA.filter((r) => r.clientType === "EXTERNO");
  const topInternosA = rankClients(internosA, returnsInternosA).slice(0, TOP_CLIENTES);
  const topExternosA = rankClients(externosA, returnsExternosA).slice(0, TOP_CLIENTES);

  const rows: ComparisonRow[] = comparison
    ? visao === "junto"
      ? [
          {
            label: "Faturamento (R$)",
            a: comparison.a.total.brl,
            b: comparison.b.total.brl,
            c: comparison.c ? comparison.c.total.brl : null,
            unit: "currency" as const,
          },
          {
            label: "Sacas",
            a: comparison.a.total.sacas,
            b: comparison.b.total.sacas,
            c: comparison.c ? comparison.c.total.sacas : null,
            unit: "sacas" as const,
          },
        ]
      : [
          {
            label: "Faturamento Interno (R$)",
            a: comparison.a.interno.brl,
            b: comparison.b.interno.brl,
            c: comparison.c ? comparison.c.interno.brl : null,
            unit: "currency" as const,
          },
          {
            label: "Faturamento Externo (R$)",
            a: comparison.a.externo.brl,
            b: comparison.b.externo.brl,
            c: comparison.c ? comparison.c.externo.brl : null,
            unit: "currency" as const,
          },
          {
            label: "Faturamento Total (R$)",
            a: comparison.a.total.brl,
            b: comparison.b.total.brl,
            c: comparison.c ? comparison.c.total.brl : null,
            unit: "currency" as const,
          },
          {
            label: "Sacas Interno",
            a: comparison.a.interno.sacas,
            b: comparison.b.interno.sacas,
            c: comparison.c ? comparison.c.interno.sacas : null,
            unit: "sacas" as const,
          },
          {
            label: "Sacas Externo",
            a: comparison.a.externo.sacas,
            b: comparison.b.externo.sacas,
            c: comparison.c ? comparison.c.externo.sacas : null,
            unit: "sacas" as const,
          },
          {
            label: "Sacas Total",
            a: comparison.a.total.sacas,
            b: comparison.b.total.sacas,
            c: comparison.c ? comparison.c.total.sacas : null,
            unit: "sacas" as const,
          },
        ]
    : [];

  return (
    <div className="flex flex-col">
      <Topbar
        title="Relatório Comparativo de Vendas"
        subtitle="Compare dois ou tres periodos, com o mercado interno e externo juntos ou separados"
      />
      <div className="space-y-6 p-6 print:space-y-2 print:p-0">
        <div className="space-y-3 print:hidden">
          <PeriodComparison />
          <MercadoFilter />
        </div>

        <div className="mb-2 hidden items-end justify-between border-b-2 border-primary pb-1.5 print:flex">
          <div className="flex items-center gap-3">
            <Image src="/nayme-logo.png" alt="Nayme" width={32} height={32} className="h-8 w-8 rounded-full" />
            <div>
              <p className="text-sm font-semibold tracking-wide">NAYME</p>
              <p className="text-[9px] text-muted">Tesouraria Corporativa</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold">Relatório Comparativo de Vendas</p>
            <p className="text-[9px] text-muted">Emitido em {formatDate(new Date().toISOString().slice(0, 10))}</p>
          </div>
        </div>

        {comparison ? (
          <>
            <ComparacaoVendasReport
              title="Comparativo de Vendas"
              periodALabel={`Período A (${cmpFromA} a ${cmpToA})`}
              periodBLabel={`Período B (${cmpFromB} a ${cmpToB})`}
              periodCLabel={cmpFromC && cmpToC ? `Período C (${cmpFromC} a ${cmpToC})` : null}
              rows={rows}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-1 print:gap-2">
              <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
                <CardHeader className="print:pb-1.5">
                  <CardTitle className="print:text-xs">
                    {TOP_CLIENTES} Maiores Clientes Internos — Período A ({cmpFromA} a {cmpToA})
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full whitespace-nowrap text-sm print:text-[10px]">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted print:text-[9px]">
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">#</th>
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Cliente</th>
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Sacas</th>
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Faturamento (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topInternosA.map(([name, agg], i) => (
                        <tr key={name} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 text-muted print:px-2 print:py-0.5">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium print:px-2 print:py-0.5">{name}</td>
                          <td className="px-4 py-2.5 print:px-2 print:py-0.5">
                            {agg.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                          </td>
                          <td className={cn("px-4 py-2.5 print:px-2 print:py-0.5", agg.valueBRL < 0 && "text-danger")}>
                            {formatCurrency(agg.valueBRL)}
                          </td>
                        </tr>
                      ))}
                      {topInternosA.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted">
                            Nenhuma venda interna no período A.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
                <CardHeader className="print:pb-1.5">
                  <CardTitle className="print:text-xs">
                    {TOP_CLIENTES} Maiores Clientes Externos — Período A ({cmpFromA} a {cmpToA})
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full whitespace-nowrap text-sm print:text-[10px]">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted print:text-[9px]">
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">#</th>
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Cliente</th>
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">País</th>
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Sacas</th>
                        <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Faturamento (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topExternosA.map(([name, agg], i) => (
                        <tr key={name} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 text-muted print:px-2 print:py-0.5">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium print:px-2 print:py-0.5">{name}</td>
                          <td className="px-4 py-2.5 print:px-2 print:py-0.5">{countryLabel(agg.country)}</td>
                          <td className="px-4 py-2.5 print:px-2 print:py-0.5">
                            {agg.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                          </td>
                          <td className={cn("px-4 py-2.5 print:px-2 print:py-0.5", agg.valueBRL < 0 && "text-danger")}>
                            {formatCurrency(agg.valueBRL)}
                          </td>
                        </tr>
                      ))}
                      {topExternosA.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-muted">
                            Nenhuma venda externa no período A.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            Escolha os períodos A e B acima e clique em &quot;Comparar&quot; para gerar o relatório.
          </p>
        )}
      </div>
    </div>
  );
}
