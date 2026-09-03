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
      {subiu ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
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
                <th className="px-4 py-2.5 font-medium">Geral {yearAnterior}</th>
                <th className="px-4 py-2.5 font-medium">Geral {yearAtual}</th>
                <th className="px-4 py-2.5 font-medium">Var. Geral</th>
                <th className="px-4 py-2.5 font-medium">Interno {yearAnterior}</th>
                <th className="px-4 py-2.5 font-medium">Interno {yearAtual}</th>
                <th className="px-4 py-2.5 font-medium">Var. Interno</th>
                <th className="px-4 py-2.5 font-medium">Externo {yearAnterior}</th>
                <th className="px-4 py-2.5 font-medium">Externo {yearAtual}</th>
                <th className="px-4 py-2.5 font-medium">Var. Externo</th>
                <th className="px-4 py-2.5 font-medium">Contêineres {yearAnterior}</th>
                <th className="px-4 py-2.5 font-medium">Contêineres {yearAtual}</th>
                <th className="px-4 py-2.5 font-medium">Var. Contêineres</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{r.label}</td>
                  <td className="px-4 py-2.5">{formatCurrency(r.geralAnterior)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(r.geralAtual)}</td>
                  <td className="px-4 py-2.5">
                    <DeltaBadge anterior={r.geralAnterior} atual={r.geralAtual} />
                  </td>
                  <td className="px-4 py-2.5">{formatCurrency(r.internoAnterior)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(r.internoAtual)}</td>
                  <td className="px-4 py-2.5">
                    <DeltaBadge anterior={r.internoAnterior} atual={r.internoAtual} />
                  </td>
                  <td className="px-4 py-2.5">{formatCurrency(r.externoAnterior)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(r.externoAtual)}</td>
                  <td className="px-4 py-2.5">
                    <DeltaBadge anterior={r.externoAnterior} atual={r.externoAtual} />
                  </td>
                  <td className="px-4 py-2.5">{r.containersAnterior.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">{r.containersAtual.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">
                    <DeltaBadge anterior={r.containersAnterior} atual={r.containersAtual} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}
