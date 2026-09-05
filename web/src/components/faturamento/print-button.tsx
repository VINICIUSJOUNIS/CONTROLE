"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <>
      <style>{`
        @media print {
          @page { size: 297mm 210mm; margin: 8mm; }
        }
      `}</style>
      <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
        <Printer size={14} />
        Imprimir / PDF
      </Button>
    </>
  );
}
