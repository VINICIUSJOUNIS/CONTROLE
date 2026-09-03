"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type MonthRow = {
  label: string;
  geral: number;
  interno: number;
  pctInterno: number;
  externo: number;
  containers: number;
  pctExterno: number;
};

export function MonthlyBreakdown({ year, rows }: { year: string; rows: MonthRow[] }) {
  const [open, setOpen] = useState(false);

  if (rows.length === 0) return null;

  return (
    <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium print:hidden"
      >
        Detalhamento mensal — {year}
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <p className="hidden px-4 pt-4 text-sm font-medium print:block">Detalhamento mensal — {year}</p>
      <CardContent className={cn("overflow-x-auto pt-0 print:overflow-visible", !open && "hidden print:block")}>
        <table className="w-full whitespace-nowrap text-sm print:text-[10px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted print:text-[9px]">
              <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Mês</th>
              <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Faturamento Geral (R$)</th>
              <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Mercado Interno (R$)</th>
              <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">% Interno</th>
              <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Mercado Externo (R$)</th>
              <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">% Externo</th>
              <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Contêineres</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-medium print:px-2 print:py-0.5">{r.label}</td>
                <td className="px-4 py-2.5 print:px-2 print:py-0.5">{formatCurrency(r.geral)}</td>
                <td className="px-4 py-2.5 print:px-2 print:py-0.5">{formatCurrency(r.interno)}</td>
                <td className="px-4 py-2.5 print:px-2 print:py-0.5">{formatPercent(r.pctInterno, 1)}</td>
                <td className="px-4 py-2.5 print:px-2 print:py-0.5">{formatCurrency(r.externo)}</td>
                <td className="px-4 py-2.5 print:px-2 print:py-0.5">{formatPercent(r.pctExterno, 1)}</td>
                <td className="px-4 py-2.5 print:px-2 print:py-0.5">{r.containers.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
