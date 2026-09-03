"use client";

import { useState } from "react";
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type ComparisonRow = {
  label: string;
  geralAnterior: number;
  geralAtual: number;
  internoAnterior: number;
  internoAtual: number;
  externoAnterior: number;
  externoAtual: number;
  containersAnterior: number;
  containersAtual: number;
};

function DeltaBadge({ anterior, atual }: { anterior: number; atual: number }) {
  const delta = anterior !== 0 ? ((atual - anterior) / anterior) * 100 : null;
  const subiu = atual >= anterior;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", subiu ? "text-success" : "text-danger")}>
      {subiu ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {delta !== null ? formatPercent(Math.abs(delta), 1) : "-"}
    </span>
  );
}

export function YearComparison({
  yearAnterior,
  yearAtual,
  rows,
}: {
  yearAnterior: string;
  yearAtual: string;
  rows: ComparisonRow[];
}) {
  const [open, setOpen] = useState(false);

  if (rows.length === 0) return null;

  return (
    <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium print:hidden"
      >
        Comparativo — {yearAnterior} x {yearAtual}
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <p className="hidden px-4 pt-4 text-sm font-medium print:block">
        Comparativo — {yearAnterior} x {yearAtual}
      </p>
      <CardContent className={cn("overflow-x-auto pt-0 print:overflow-visible", !open && "hidden print:block")}>
        <table className="w-full whitespace-nowrap text-xs [font-variant-numeric:tabular-nums] print:w-auto print:text-[7px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] text-muted print:text-[7px]">
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Mês</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Geral {yearAnterior}</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Geral {yearAtual}</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Var. Geral</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Interno {yearAnterior}</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Interno {yearAtual}</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Var. Interno</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Externo {yearAnterior}</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Externo {yearAtual}</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Var. Externo</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Cnt {yearAnterior}</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Cnt {yearAtual}</th>
              <th className="px-2 py-1.5 font-medium print:px-1 print:py-0.5">Var. Cnt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td className="px-2 py-1 font-medium print:px-1 print:py-0">{r.label}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">{formatCurrency(r.geralAnterior)}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">{formatCurrency(r.geralAtual)}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">
                  <DeltaBadge anterior={r.geralAnterior} atual={r.geralAtual} />
                </td>
                <td className="px-2 py-1 print:px-1 print:py-0">{formatCurrency(r.internoAnterior)}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">{formatCurrency(r.internoAtual)}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">
                  <DeltaBadge anterior={r.internoAnterior} atual={r.internoAtual} />
                </td>
                <td className="px-2 py-1 print:px-1 print:py-0">{formatCurrency(r.externoAnterior)}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">{formatCurrency(r.externoAtual)}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">
                  <DeltaBadge anterior={r.externoAnterior} atual={r.externoAtual} />
                </td>
                <td className="px-2 py-1 print:px-1 print:py-0">{r.containersAnterior.toLocaleString("pt-BR")}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">{r.containersAtual.toLocaleString("pt-BR")}</td>
                <td className="px-2 py-1 print:px-1 print:py-0">
                  <DeltaBadge anterior={r.containersAnterior} atual={r.containersAtual} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
