"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// Lupa do card: abre uma janela com a origem dos numeros, o calculo (com os
// valores atuais) e a logica do indicador.
export function KpiExplicacao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          title="Entender este número"
          aria-label={`Entender este número: ${titulo}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted ring-1 ring-inset ring-border transition-colors hover:bg-primary/10 hover:text-primary print:hidden"
        >
          <Search size={14} />
        </button>
      </DialogTrigger>
      <DialogContent title={titulo} className="max-w-2xl">
        <div className="space-y-4 text-sm">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

// Blocos padrao da explicacao: De onde vem / Calculo / Logica.
export function ExplicacaoSecoes({
  origem,
  calculo,
  logica,
}: {
  origem: ReactNode;
  calculo: ReactNode[];
  logica: ReactNode;
}) {
  return (
    <>
      <section>
        <h3 className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-primary">DE ONDE VEM</h3>
        <div className="text-muted">{origem}</div>
      </section>
      <section>
        <h3 className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-primary">CÁLCULO</h3>
        <ul className="space-y-1 rounded-lg border border-border bg-background/40 p-3 font-mono text-xs leading-relaxed">
          {calculo.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-primary">LÓGICA</h3>
        <div className="text-muted">{logica}</div>
      </section>
    </>
  );
}
