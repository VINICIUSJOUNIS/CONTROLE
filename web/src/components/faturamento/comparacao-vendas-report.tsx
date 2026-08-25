"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Printer } from "lucide-react";

export type ComparisonRow = {
  label: string;
  a: number;
  b: number;
  c: number | null;
  format: (v: number) => string;
};

function deltaPct(base: number, value: number) {
  if (base === 0) return null;
  return ((value - base) / base) * 100;
}

function pctFmt(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function ComparacaoVendasReport({
  title,
  periodALabel,
  periodBLabel,
  periodCLabel,
  rows,
}: {
  title: string;
  periodALabel: string;
  periodBLabel: string;
  periodCLabel: string | null;
  rows: ComparisonRow[];
}) {
  const hasC = periodCLabel != null;

  function handleExportCsv() {
    const header = [
      "Metrica",
      periodALabel,
      periodBLabel,
      "Var. A vs B",
      ...(hasC ? [periodCLabel!, "Var. A vs C"] : []),
    ];
    const lines = rows.map((r) => {
      const deltaAB = deltaPct(r.b, r.a);
      const cells = [r.label, r.format(r.a), r.format(r.b), deltaAB !== null ? pctFmt(deltaAB) : "-"];
      if (hasC) {
        const deltaAC = r.c !== null ? deltaPct(r.c, r.a) : null;
        cells.push(r.c !== null ? r.format(r.c) : "-", deltaAC !== null ? pctFmt(deltaAC) : "-");
      }
      return cells.map((v) => `"${v}"`).join(";");
    });
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparativo-vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <CardTitle>{title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download size={14} />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={14} />
            Imprimir / PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 print:p-0">
        <table className="w-full whitespace-nowrap text-sm print:text-[10px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-2.5 font-medium">Métrica</th>
              <th className="px-4 py-2.5 font-medium">{periodALabel}</th>
              <th className="px-4 py-2.5 font-medium">{periodBLabel}</th>
              <th className="px-4 py-2.5 font-medium">Var. A vs B</th>
              {hasC && (
                <>
                  <th className="px-4 py-2.5 font-medium">{periodCLabel}</th>
                  <th className="px-4 py-2.5 font-medium">Var. A vs C</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const deltaAB = deltaPct(row.b, row.a);
              const deltaAC = row.c !== null ? deltaPct(row.c, row.a) : null;
              return (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{row.label}</td>
                  <td className={cn("px-4 py-2.5", row.a < 0 && "text-danger")}>{row.format(row.a)}</td>
                  <td className={cn("px-4 py-2.5", row.b < 0 && "text-danger")}>{row.format(row.b)}</td>
                  <td className="px-4 py-2.5">
                    {deltaAB === null ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <span className={deltaAB >= 0 ? "text-success" : "text-danger"}>
                        {deltaAB >= 0 ? "+" : ""}
                        {pctFmt(deltaAB)}
                      </span>
                    )}
                  </td>
                  {hasC && (
                    <>
                      <td className={cn("px-4 py-2.5", row.c != null && row.c < 0 && "text-danger")}>
                        {row.c !== null ? row.format(row.c) : "-"}
                      </td>
                      <td className="px-4 py-2.5">
                        {deltaAC === null ? (
                          <span className="text-muted">-</span>
                        ) : (
                          <span className={deltaAC >= 0 ? "text-success" : "text-danger"}>
                            {deltaAC >= 0 ? "+" : ""}
                            {pctFmt(deltaAC)}
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
