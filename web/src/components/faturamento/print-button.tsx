"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>
      <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
        <Printer size={14} />
        Imprimir / PDF
      </Button>
    </>
  );
}
