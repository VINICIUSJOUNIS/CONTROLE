"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { formatCompactCurrency, formatDate } from "@/lib/format";
import { ContratoRow } from "@/lib/hedge-data";
import { updateContratoStatus, StatusContratoValue } from "@/app/(dashboard)/hedge/contratos/actions";
import {
  Cliente,
  statusOrder,
  statusLabels,
  relevantDateField,
  dateFieldLabels,
} from "@/lib/contrato-shared";
import { MapPin, Calendar, ChevronDown, ChevronUp } from "lucide-react";

export function MesaOperacaoBoard({
  clientes,
  contratos,
}: {
  clientes: Cliente[];
  contratos: ContratoRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contratos.filter((c) => {
      if (clienteFilter !== "todos" && c.clienteId !== clienteFilter) return false;
      if (term) {
        const matches =
          c.contractNumber.toLowerCase().includes(term) || c.clienteName.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [contratos, clienteFilter, search]);

  const rows = useMemo(() => {
    return statusOrder.map((status) => ({
      status,
      items: filtered.filter((c) => c.status === status),
    }));
  }, [filtered]);

  function moveStatus(id: string, direction: -1 | 1) {
    const current = contratos.find((c) => c.id === id);
    if (!current) return;
    const currentIndex = statusOrder.indexOf(current.status as StatusContratoValue);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= statusOrder.length) return;
    const nextStatus = statusOrder[nextIndex];
    startTransition(async () => {
      await updateContratoStatus(id, nextStatus);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por contrato ou cliente"
          className="w-64"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-border/20 px-4 py-2.5">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Mesa de Operações</h2>
        </div>
        <div className="divide-y divide-border">
          {rows.map((row, rowIndex) => (
            <div key={row.status} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide">{statusLabels[row.status]}</h3>
                <Badge variant="neutral">{row.items.length}</Badge>
              </div>

              {row.items.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {row.items.map((item) => {
                    const dateField = relevantDateField[item.status as StatusContratoValue];
                    const dateValue = item[dateField];
                    return (
                      <div
                        key={item.id}
                        className="w-64 shrink-0 rounded-lg border border-border bg-background p-3"
                      >
                        <p className="font-semibold">{item.contractNumber}</p>
                        <p className="text-sm">{item.clienteName}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <MapPin size={12} />
                          {item.country}
                        </p>
                        <p className="mt-2 text-sm font-medium text-primary">
                          {formatCompactCurrency(item.valorUsd, "USD")}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                          <Calendar size={12} />
                          {dateValue
                            ? `${dateFieldLabels[dateField]}: ${formatDate(dateValue)}`
                            : `${dateFieldLabels[dateField]}: sem data`}
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                          <button
                            onClick={() => moveStatus(item.id, -1)}
                            disabled={isPending || rowIndex === 0}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                            Voltar
                          </button>
                          <button
                            onClick={() => moveStatus(item.id, 1)}
                            disabled={isPending || rowIndex === statusOrder.length - 1}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-30"
                          >
                            Avançar
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
