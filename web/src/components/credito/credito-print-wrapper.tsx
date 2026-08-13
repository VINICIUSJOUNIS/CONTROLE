"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Printer } from "lucide-react";
import type { ReactNode } from "react";

export function CreditoPrintWrapper({
  periodLabels,
  children,
}: {
  periodLabels: string[];
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <Image
          src="/nayme-logo.png"
          alt=""
          width={420}
          height={420}
          className="h-[280px] w-[280px] opacity-[0.05] print:h-[200px] print:w-[200px]"
        />
      </div>

      <div className="relative z-10 space-y-8">
        <div className="flex items-center justify-end print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={14} />
            Imprimir / PDF
          </Button>
        </div>

        <div className="mb-2 hidden items-end justify-between border-b-2 border-primary pb-4 print:flex print:pb-1.5">
          <div className="flex items-center gap-3">
            <Image src="/nayme-logo.png" alt="Nayme" width={48} height={48} className="rounded-full print:h-8 print:w-8" />
            <div>
              <p className="text-lg font-semibold tracking-wide print:text-sm">NAYME</p>
              <p className="text-xs text-muted print:text-[9px]">Tesouraria Corporativa</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold print:text-xs">Relatório Geral — Análise de Crédito</p>
            <p className="text-xs text-muted print:text-[9px]">Período(s): {periodLabels.join(" · ")}</p>
            <p className="text-xs text-muted print:text-[9px]">
              Emitido em {formatDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>
        </div>

        {children}

        <div className="mt-4 hidden grid-cols-2 gap-12 print:grid print:gap-8">
          <div className="text-center text-xs print:text-[9px]">
            <div className="mb-1 border-t border-foreground pt-2 print:pt-1">Assinatura do responsável</div>
          </div>
          <div className="text-center text-xs print:text-[9px]">
            <div className="mb-1 border-t border-foreground pt-2 print:pt-1">Data</div>
          </div>
        </div>

        <div className="mt-4 hidden border-t border-border pt-2 text-center text-[10px] text-muted print:block print:pt-1 print:text-[8px]">
          NAYME - Tesouraria Corporativa
        </div>
      </div>
    </div>
  );
}
