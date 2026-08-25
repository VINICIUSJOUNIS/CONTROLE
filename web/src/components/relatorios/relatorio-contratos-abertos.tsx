"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCompactCurrency, formatDate, formatPercent } from "@/lib/format";
import { Download, Printer } from "lucide-react";

const rateBasisSuffix: Record<string, string> = {
  MENSAL: "a.m.",
  SEMESTRAL: "a.s.",
  ANUAL: "a.a.",
};

type ReportRow = {
  id: string;
  tipo: "Emprestimo" | "ACC";
  bankName: string;
  contractDate: string;
  valorTomado: number;
  valorEmAberto: number;
  vencimento: string;
  taxaJuros: number;
  taxaBase: string;
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
  const [showTaxas, setShowTaxas] = useState(false);

  function handleExportCsv() {
    const header = [
      "Tipo",
      "Banco",
      "Data da contratacao",
      "Valor tomado",
      "Valor em aberto",
      "Vencimento",
      ...(showTaxas ? ["Taxa"] : []),
    ];
    const lines = rows.map((r) =>
      [
        r.tipo,
        r.bankName,
        formatDate(r.contractDate),
        r.valorTomado.toFixed(2).replace(".", ","),
        r.valorEmAberto.toFixed(2).replace(".", ","),
        formatDate(r.vencimento),
        ...(showTaxas ? [`${formatPercent(r.taxaJuros)} ${rateBasisSuffix[r.taxaBase] ?? ""}`.trim()] : []),
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
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Image
          src="/nayme-logo.png"
          alt=""
          width={320}
          height={320}
          className="h-[220px] w-[220px] opacity-[0.06] print:h-[160px] print:w-[160px]"
        />
      </div>

      <CardHeader className="relative flex flex-row items-center justify-between print:hidden">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={showTaxas}
              onChange={(e) => setShowTaxas(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Mostrar taxas
          </label>
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
      <CardContent className="relative overflow-x-auto print:p-0">
        <div className="mb-6 hidden items-end justify-between border-b-2 border-primary pb-4 print:mb-2 print:flex print:pb-1.5">
          <div className="flex items-center gap-3">
            <Image src="/nayme-logo.png" alt="Nayme" width={48} height={48} className="rounded-full print:h-8 print:w-8" />
            <div>
              <p className="text-lg font-semibold tracking-wide print:text-sm">NAYME</p>
              <p className="text-xs text-muted print:text-[9px]">Tesouraria Corporativa</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold print:text-xs">{title}</p>
            <p className="text-xs text-muted print:text-[9px]">
              Emitido em {formatDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>
        </div>
        <table className="w-full text-sm print:text-[10px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted print:text-[9px]">
              <th className="pb-2 pr-4 font-medium print:pb-1">Tipo</th>
              <th className="pb-2 pr-4 font-medium print:pb-1">Banco</th>
              <th className="pb-2 pr-4 font-medium print:pb-1">Data da contratacao</th>
              <th className="pb-2 pr-4 font-medium print:pb-1">Valor tomado</th>
              <th className="pb-2 pr-4 font-medium print:pb-1">Valor em aberto</th>
              <th className={`pb-2 font-medium print:pb-1 ${showTaxas ? "pr-4" : ""}`}>Vencimento</th>
              {showTaxas && <th className="pb-2 font-medium print:pb-1">Taxa</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.tipo}-${r.id}`} className="border-b border-border last:border-0">
                <td className="py-2.5 pr-4 print:py-0.5">
                  <Badge variant="neutral">{r.tipo}</Badge>
                </td>
                <td className="py-2.5 pr-4 font-medium print:py-0.5">{r.bankName}</td>
                <td className="py-2.5 pr-4 print:py-0.5">{formatDate(r.contractDate)}</td>
                <td className="py-2.5 pr-4 print:py-0.5">{formatCompactCurrency(r.valorTomado)}</td>
                <td className="py-2.5 pr-4 print:py-0.5">{formatCompactCurrency(r.valorEmAberto)}</td>
                <td className={`py-2.5 print:py-0.5 ${showTaxas ? "pr-4" : ""}`}>{formatDate(r.vencimento)}</td>
                {showTaxas && (
                  <td className="py-2.5 print:py-0.5">
                    {formatPercent(r.taxaJuros)} {rateBasisSuffix[r.taxaBase] ?? ""}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={showTaxas ? 7 : 6} className="py-8 text-center text-muted">
                  Nenhum registro em aberto no momento.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="py-2.5 pr-4 print:py-1" colSpan={3}>
                  Total
                </td>
                <td className="py-2.5 pr-4 print:py-1">{formatCompactCurrency(totalTomado)}</td>
                <td className="py-2.5 pr-4 print:py-1">{formatCompactCurrency(totalAberto)}</td>
                <td />
                {showTaxas && <td />}
              </tr>
            </tfoot>
          )}
        </table>

        <div className="mt-12 hidden grid-cols-2 gap-12 print:mt-4 print:grid print:gap-8">
          <div className="text-center text-xs print:text-[9px]">
            <div className="mb-1 border-t border-foreground pt-2 print:pt-1">Assinatura do responsavel</div>
          </div>
          <div className="text-center text-xs print:text-[9px]">
            <div className="mb-1 border-t border-foreground pt-2 print:pt-1">Data</div>
          </div>
        </div>

        <div className="mt-12 hidden border-t border-border pt-2 text-center text-[10px] text-muted print:mt-2 print:block print:pt-1 print:text-[8px]">
          NAYME - Tesouraria Corporativa
        </div>
      </CardContent>
    </Card>
  );
}
