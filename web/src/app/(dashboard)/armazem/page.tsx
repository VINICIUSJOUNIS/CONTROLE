import { Topbar } from "@/components/layout/topbar";

export default function ArmazemPage() {
  return (
    <div className="flex flex-col">
      <Topbar title="Armazém" subtitle="Controle do armazém" />
      <div className="p-6">
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Módulo em construção.
        </div>
      </div>
    </div>
  );
}
