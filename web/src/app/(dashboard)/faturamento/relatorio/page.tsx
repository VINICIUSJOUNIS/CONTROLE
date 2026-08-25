import Image from "next/image";
import { Topbar } from "@/components/layout/topbar";
import { PeriodComparison } from "@/components/dashboard/period-comparison";
import { MercadoFilter } from "@/components/faturamento/mercado-filter";
import { ComparacaoVendasReport, type ComparisonRow } from "@/components/faturamento/comparacao-vendas-report";
import { getSales, getSaleReturns, type SaleRow, type SaleReturnRow } from "@/lib/data";
import { formatDate } from "@/lib/format";

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
          <ComparacaoVendasReport
            title="Comparativo de Vendas"
            periodALabel={`Período A (${cmpFromA} a ${cmpToA})`}
            periodBLabel={`Período B (${cmpFromB} a ${cmpToB})`}
            periodCLabel={cmpFromC && cmpToC ? `Período C (${cmpFromC} a ${cmpToC})` : null}
            rows={rows}
          />
        ) : (
          <p className="text-sm text-muted">
            Escolha os períodos A e B acima e clique em &quot;Comparar&quot; para gerar o relatório.
          </p>
        )}
      </div>
    </div>
  );
}
