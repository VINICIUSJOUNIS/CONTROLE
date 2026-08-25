"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { countryLabel } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { Download, Printer } from "lucide-react";

export type ClientRankRow = {
  name: string;
  sacas: number;
  valueBRL: number;
  country: string | null;
};

function pctFmt(v: number) {
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function pctOf(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

export function TopClientesReport({
  periodLabel,
  internos,
  externos,
  totalInternoBRL,
  totalExternoBRL,
  topCount,
}: {
  periodLabel: string;
  internos: ClientRankRow[];
  externos: ClientRankRow[];
  totalInternoBRL: number;
  totalExternoBRL: number;
  topCount: number;
}) {
  function handleExportCsv() {
    const header = ["Mercado", "Cliente", "Pais", "Sacas", "Faturamento (R$)", "% do Mercado"];
    const lines = [
      ...internos.map((c) => [
        "Interno",
        c.name,
        "-",
        c.sacas.toFixed(0),
        c.valueBRL.toFixed(2).replace(".", ","),
        pctFmt(pctOf(c.valueBRL, totalInternoBRL)),
      ]),
      ...externos.map((c) => [
        "Externo",
        c.name,
        countryLabel(c.country),
        c.sacas.toFixed(0),
        c.valueBRL.toFixed(2).replace(".", ","),
        pctFmt(pctOf(c.valueBRL, totalExternoBRL)),
      ]),
    ].map((cells) => cells.map((v) => `"${v}"`).join(";"));
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `top-clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 print:space-y-2">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Maiores Clientes</h2>
          <p className="text-xs text-muted">{periodLabel}</p>
        </div>
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
          <p className="text-xs font-semibold">Maiores Clientes — {periodLabel}</p>
          <p className="text-[9px] text-muted">Emitido em {formatDate(new Date().toISOString().slice(0, 10))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 print:grid-cols-1 print:gap-2">
        <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
          <CardHeader className="print:pb-1.5">
            <CardTitle className="print:text-xs">{topCount} Maiores Clientes Internos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full whitespace-nowrap text-sm print:text-[10px]">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted print:text-[9px]">
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">#</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Cliente</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Sacas</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Faturamento (R$)</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">% do Interno</th>
                </tr>
              </thead>
              <tbody>
                {internos.map((c, i) => (
                  <tr key={c.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-muted print:px-2 print:py-0.5">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium print:px-2 print:py-0.5">{c.name}</td>
                    <td className="px-4 py-2.5 print:px-2 print:py-0.5">
                      {c.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </td>
                    <td className={cn("px-4 py-2.5 print:px-2 print:py-0.5", c.valueBRL < 0 && "text-danger")}>
                      {formatCurrency(c.valueBRL)}
                    </td>
                    <td className="px-4 py-2.5 print:px-2 print:py-0.5">
                      {pctFmt(pctOf(c.valueBRL, totalInternoBRL))}
                    </td>
                  </tr>
                ))}
                {internos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted">
                      Nenhuma venda interna neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid print:border-0 print:shadow-none">
          <CardHeader className="print:pb-1.5">
            <CardTitle className="print:text-xs">{topCount} Maiores Clientes Externos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full whitespace-nowrap text-sm print:text-[10px]">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted print:text-[9px]">
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">#</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Cliente</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">País</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Sacas</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">Faturamento (R$)</th>
                  <th className="px-4 py-2.5 font-medium print:px-2 print:py-1">% do Externo</th>
                </tr>
              </thead>
              <tbody>
                {externos.map((c, i) => (
                  <tr key={c.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-muted print:px-2 print:py-0.5">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium print:px-2 print:py-0.5">{c.name}</td>
                    <td className="px-4 py-2.5 print:px-2 print:py-0.5">{countryLabel(c.country)}</td>
                    <td className="px-4 py-2.5 print:px-2 print:py-0.5">
                      {c.sacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </td>
                    <td className={cn("px-4 py-2.5 print:px-2 print:py-0.5", c.valueBRL < 0 && "text-danger")}>
                      {formatCurrency(c.valueBRL)}
                    </td>
                    <td className="px-4 py-2.5 print:px-2 print:py-0.5">
                      {pctFmt(pctOf(c.valueBRL, totalExternoBRL))}
                    </td>
                  </tr>
                ))}
                {externos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted">
                      Nenhuma venda externa neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
