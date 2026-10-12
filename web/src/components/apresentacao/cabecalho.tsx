import { PrintButton } from "@/components/faturamento/print-button";

// Faixa de abertura das paginas "Apresentacao" de cada modulo: titulo, data de
// referencia e impressao em paisagem.
export function CabecalhoApresentacao({ titulo, referencia }: { titulo: string; referencia: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Apresentação</p>
        <h2 className="text-2xl font-semibold">{titulo}</h2>
        <p className="text-sm text-muted">{referencia}</p>
      </div>
      <PrintButton />
    </div>
  );
}

export function hojeExtenso() {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());
}
