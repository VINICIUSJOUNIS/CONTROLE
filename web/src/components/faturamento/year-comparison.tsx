"use client";

import { useState } from "react";
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type ComparisonRow = { label: string; anterior: number; atual: number };

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
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium"
      >
        Comparativo — {yearAnterior} x {yearAtual}
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Mês</th>
                <th className="px-4 py-2.5 font-medium">{yearAnterior} (R$)</th>
                <th className="px-4 py-2.5 font-medium">{yearAtual} (R$)</th>
                <th className="px-4 py-2.5 font-medium">Variação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const delta = r.anterior !== 0 ? ((r.atual - r.anterior) / r.anterior) * 100 : null;
                const subiu = r.atual >= r.anterior;
                return (
                  <tr key={r.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">{r.label}</td>
                    <td className="px-4 py-2.5">{formatCurrency(r.anterior)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(r.atual)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium",
                          subiu ? "text-success" : "text-danger"
                        )}
                      >
                        {subiu ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        {delta !== null ? formatPercent(Math.abs(delta), 1) : "-"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}
