"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type MonthRow = { label: string; geral: number; interno: number; externo: number };

export function MonthlyBreakdown({ year, rows }: { year: string; rows: MonthRow[] }) {
  const [open, setOpen] = useState(false);

  if (rows.length === 0) return null;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium"
      >
        Detalhamento mensal — {year}
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Mês</th>
                <th className="px-4 py-2.5 font-medium">Faturamento Geral (R$)</th>
                <th className="px-4 py-2.5 font-medium">Mercado Interno (R$)</th>
                <th className="px-4 py-2.5 font-medium">Mercado Externo (R$)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{r.label}</td>
                  <td className="px-4 py-2.5">{formatCurrency(r.geral)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(r.interno)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(r.externo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}
