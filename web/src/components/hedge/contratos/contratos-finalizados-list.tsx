"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { formatCompactCurrency, formatDate } from "@/lib/format";
import { ContratoRow } from "@/lib/hedge-data";
import { setContratoFinalizado } from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import { MapPin, RotateCcw } from "lucide-react";

export function ContratosFinalizadosList({ contratos }: { contratos: ContratoRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contratos;
    return contratos.filter(
      (c) =>
        c.contractNumber.toLowerCase().includes(term) || c.clienteName.toLowerCase().includes(term)
    );
  }, [contratos, search]);

  function reabrir(id: string, contractNumber: string) {
    if (
      !window.confirm(
        `Deseja realmente reabrir o contrato ${contractNumber}? Ele vai voltar a aparecer na Mesa de Operação.`
      )
    )
      return;
    startTransition(async () => {
      await setContratoFinalizado(id, false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por contrato ou cliente"
        className="w-64"
      />

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Nenhum contrato finalizado.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.contractNumber}</p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  {item.clienteName}
                  <MapPin size={11} className="ml-1" />
                  {item.country}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium text-primary">
                {formatCompactCurrency(item.valorUsd, "USD")}
              </p>
              <p className="shrink-0 text-xs text-muted">
                Finalizado em: {item.dataFinalizacao ? formatDate(item.dataFinalizacao) : "-"}
              </p>
              <button
                onClick={() => reabrir(item.id, item.contractNumber)}
                disabled={isPending}
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/40 hover:text-foreground disabled:opacity-50"
              >
                <RotateCcw size={13} />
                Reabrir
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
