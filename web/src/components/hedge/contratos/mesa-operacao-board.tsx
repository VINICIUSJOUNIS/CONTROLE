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
  dateFieldLabels,
  buildMesaOperacaoSections,
} from "@/lib/contrato-shared";
import { MapPin, Calendar, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

const sections = buildMesaOperacaoSections();

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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  const itemsByStatus = useMemo(() => {
    const map = {} as Record<StatusContratoValue, ContratoRow[]>;
    for (const status of statusOrder) {
      map[status] = filtered.filter((c) => c.status === status);
    }
    return map;
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

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
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
          {sections.map((section) => {
            if (section.kind === "single") {
              return (
                <StatusRow
                  key={section.status}
                  status={section.status}
                  items={itemsByStatus[section.status]}
                  isPending={isPending}
                  moveStatus={moveStatus}
                  router={router}
                />
              );
            }

            const isCollapsed = collapsedGroups.has(section.label);
            const totalCount = section.statuses.reduce(
              (sum, s) => sum + itemsByStatus[s].length,
              0
            );

            return (
              <div key={section.label}>
                <button
                  onClick={() => toggleGroup(section.label)}
                  className="flex w-full items-center justify-between gap-2 p-4 text-left hover:bg-border/10"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    {section.label}
                  </span>
                  <Badge variant="neutral">{totalCount}</Badge>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-border border-t border-border bg-border/5">
                    {section.statuses.map((status) => (
                      <StatusRow
                        key={status}
                        status={status}
                        items={itemsByStatus[status]}
                        isPending={isPending}
                        moveStatus={moveStatus}
                        router={router}
                        indented
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatusRow({
  status,
  items,
  isPending,
  moveStatus,
  router,
  indented = false,
}: {
  status: StatusContratoValue;
  items: ContratoRow[];
  isPending: boolean;
  moveStatus: (id: string, direction: -1 | 1) => void;
  router: ReturnType<typeof useRouter>;
  indented?: boolean;
}) {
  const statusIndex = statusOrder.indexOf(status);

  return (
    <div className={indented ? "p-4 pl-8" : "p-4"}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide">{statusLabels[status]}</h3>
        <Badge variant="neutral">{items.length}</Badge>
      </div>

      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {items.map((item) => {
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
                className="w-64 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-3 hover:border-primary/50"
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
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStatus(item.id, -1);
                    }}
                    disabled={isPending || statusIndex === 0}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                    Voltar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStatus(item.id, 1);
                    }}
                    disabled={isPending || statusIndex === statusOrder.length - 1}
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
  );
}
