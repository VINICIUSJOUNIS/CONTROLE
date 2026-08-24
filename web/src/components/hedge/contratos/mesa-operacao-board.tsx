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
  statusToSlug,
  relevantDateField,
} from "@/lib/contrato-shared";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";

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

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-border/20 px-4 py-2.5">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Mesa de Operações</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto p-4">
          {columns.map((column, columnIndex) => (
            <div
              key={column.status}
              className="flex w-52 shrink-0 flex-col rounded-lg border border-border bg-background"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-2">
                <h3
                  className="truncate text-xs font-semibold uppercase tracking-wide"
                  title={statusLabels[column.status]}
                >
                  {statusLabels[column.status]}
                </h3>
                <Badge variant="neutral">{column.items.length}</Badge>
              </div>

              <div className="flex flex-col gap-2 p-2">
                {column.items.map((item) => {
                  const dateField = relevantDateField[item.status as StatusContratoValue];
                  const dateValue = item[dateField];
                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        router.push(
                          `/hedge/mesa-operacao/${statusToSlug(item.status as StatusContratoValue)}?contrato=${item.id}`
                        )
                      }
                      className="cursor-pointer rounded-md border border-border bg-card p-2 text-xs hover:border-primary/50"
                    >
                      <p className="truncate font-semibold">{item.contractNumber}</p>
                      <p className="truncate text-muted">{item.clienteName}</p>
                      <p className="mt-1 font-medium text-primary">
                        {formatCompactCurrency(item.valorUsd, "USD")}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                        <Calendar size={10} />
                        {dateValue ? formatDate(dateValue) : "sem data"}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStatus(item.id, -1);
                          }}
                          disabled={isPending || columnIndex === 0}
                          title="Voltar"
                          className="rounded p-0.5 text-muted hover:bg-border/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStatus(item.id, 1);
                          }}
                          disabled={isPending || columnIndex === statusOrder.length - 1}
                          title="Avançar"
                          className="rounded p-0.5 text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {column.items.length === 0 && (
                  <p className="py-3 text-center text-[10px] text-muted">Vazio</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
