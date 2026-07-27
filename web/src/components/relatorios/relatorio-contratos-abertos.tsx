"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency, formatDate } from "@/lib/format";
import { Download, Printer } from "lucide-react";

type ReportRow = {
  id: string;
  bankName: string;
  contractDate: string;
  valorTomado: number;
  valorEmAberto: number;
  vencimento: string;
};

export function RelatorioContratosAbertos({
  title,
  filePrefix,
  rows,
}: {
  title: string;
  filePrefix: string;
  rows: ReportRow[];
}) {
  function handleExportCsv() {
    const header = ["Banco", "Data da contratacao", "Valor tomado", "Valor em aberto", "Vencimento"];
    const lines = rows.map((r) =>
      [
        r.bankName,
        formatDate(r.contractDate),
        r.valorTomado.toFixed(2).replace(".", ","),
        r.valorEmAberto.toFixed(2).replace(".", ","),
        formatDate(r.vencimento),
      ]
        .map((v) => `"${v}"`)
        .join(";")
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalTomado = rows.reduce((s, r) => s + r.valorTomado, 0);
  const totalAberto = rows.reduce((s, r) => s + r.valorEmAberto, 0);

  return (
    <Card className="relative overflow-hidden print:break-inside-avoid print:border-0 print:shadow-none">
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center print:flex">
        <Image src="/nayme-logo.png" alt="" width={320} height={320} className="opacity-[0.08]" />
      </div>

      <CardHeader className="relative flex flex-row items-center justify-between print:hidden">
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
      <CardContent className="relative overflow-x-auto">
        <h2 className="mb-3 hidden text-base font-semibold print:block">{title}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-2 pr-4 font-medium">Banco</th>
              <th className="pb-2 pr-4 font-medium">Data da contratacao</th>
              <th className="pb-2 pr-4 font-medium">Valor tomado</th>
              <th className="pb-2 pr-4 font-medium">Valor em aberto</th>
              <th className="pb-2 font-medium">Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-4 font-medium">{r.bankName}</td>
                <td className="py-2.5 pr-4">{formatDate(r.contractDate)}</td>
                <td className="py-2.5 pr-4">{formatCompactCurrency(r.valorTomado)}</td>
                <td className="py-2.5 pr-4">{formatCompactCurrency(r.valorEmAberto)}</td>
                <td className="py-2.5">{formatDate(r.vencimento)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  Nenhum registro em aberto no momento.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="py-2.5 pr-4" colSpan={2}>
                  Total
                </td>
                <td className="py-2.5 pr-4">{formatCompactCurrency(totalTomado)}</td>
                <td className="py-2.5 pr-4">{formatCompactCurrency(totalAberto)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>

        <div className="mt-12 hidden grid-cols-2 gap-12 print:grid">
          <div className="text-center text-xs">
            <div className="mb-1 border-t border-foreground pt-2">Assinatura do responsavel</div>
          </div>
          <div className="text-center text-xs">
            <div className="mb-1 border-t border-foreground pt-2">Data</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
