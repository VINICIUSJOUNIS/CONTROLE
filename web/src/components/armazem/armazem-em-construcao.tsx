import { Topbar } from "@/components/layout/topbar";

// Pagina do Armazem ainda sem dados (outra empresa: nada vem da Nayme).
export function ArmazemEmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col">
      <Topbar title={titulo} subtitle="Armazém" />
      <div className="p-6">
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Sem dados ainda. As informações do armazém serão incluídas aqui.
        </div>
      </div>
    </div>
  );
}
