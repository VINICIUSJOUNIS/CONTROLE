"use client";

import { useState } from "react";
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type ComparisonRow = {
  label: string;
  geralAnterior: number;
  geralAtual: number;
  internoAnterior: number;
  internoAtual: number;
  externoAnterior: number;
  externoAtual: number;
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

export function YearComparisonSacas({
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
        <table className="w-full whitespace-nowrap text-xs [font-variant-numeric:tabular-nums] print:text-[9px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] text-muted print:text-[9px]">
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Mês</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Geral {yearAnterior}</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Geral {yearAtual}</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Var. Geral</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Interno {yearAnterior}</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Interno {yearAtual}</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Var. Interno</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Externo {yearAnterior}</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Externo {yearAtual}</th>
              <th className="px-2 py-1.5 font-medium print:px-2 print:py-1">Var. Externo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0">
                <td className="px-2 py-1 font-medium print:px-2 print:py-0.5">{r.label}</td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  {r.geralAnterior.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  {r.geralAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  <DeltaBadge anterior={r.geralAnterior} atual={r.geralAtual} />
                </td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  {r.internoAnterior.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  {r.internoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  <DeltaBadge anterior={r.internoAnterior} atual={r.internoAtual} />
                </td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  {r.externoAnterior.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  {r.externoAtual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-2 py-1 print:px-2 print:py-0.5">
                  <DeltaBadge anterior={r.externoAnterior} atual={r.externoAtual} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
