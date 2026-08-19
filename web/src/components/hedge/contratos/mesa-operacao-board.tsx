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
import { MapPin, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

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

  const columns = useMemo(() => {
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

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((column, columnIndex) => (
          <div key={column.status} className="w-72 shrink-0 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{statusLabels[column.status]}</h3>
              <Badge variant="neutral">{column.items.length}</Badge>
            </div>
            <div className="space-y-3">
              {column.items.map((row) => {
                const dateField = relevantDateField[row.status as StatusContratoValue];
                const dateValue = row[dateField];
                return (
                  <Card key={row.id} className="p-3">
                    <p className="font-semibold">{row.contractNumber}</p>
                    <p className="text-sm">{row.clienteName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin size={12} />
                      {row.country}
                    </p>
                    <p className="mt-2 text-sm font-medium text-primary">
                      {formatCompactCurrency(row.valorUsd, "USD")}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Calendar size={12} />
                      {dateValue
                        ? `${dateFieldLabels[dateField]}: ${formatDate(dateValue)}`
                        : `${dateFieldLabels[dateField]}: sem data`}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                      <button
                        onClick={() => moveStatus(row.id, -1)}
                        disabled={isPending || columnIndex === 0}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronLeft size={14} />
                        Voltar
                      </button>
                      <button
                        onClick={() => moveStatus(row.id, 1)}
                        disabled={isPending || columnIndex === statusOrder.length - 1}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-30"
                      >
                        Avancar
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </Card>
                );
              })}
              {column.items.length === 0 && (
                <p className="px-1 text-xs text-muted">Nenhum contrato nesta etapa.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
