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
  buildMesaOperacaoSections,
} from "@/lib/contrato-shared";
import { Calendar, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
    setExpandedGroups((prev) => {
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

        {(() => {
          const groupInfos = sections.map((section) => {
            const statuses = section.kind === "group" ? section.statuses : [section.status];
            const label = section.kind === "group" ? section.label : statusLabels[section.status];
            const key = section.kind === "group" ? section.label : section.status;
            const isExpanded = expandedGroups.has(key);
            const totalCount = statuses.reduce((sum, s) => sum + itemsByStatus[s].length, 0);
            return { key, label, statuses, isExpanded, totalCount };
          });

          return (
            <div className="p-4">
              <div className="flex flex-wrap gap-3">
                {groupInfos.map((group) => (
                  <button
                    key={group.key}
                    onClick={() => toggleGroup(group.key)}
                    className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left hover:bg-border/10"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                      {group.isExpanded ? (
                        <ChevronDown size={16} className="shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="shrink-0" />
                      )}
                      <span className="truncate">{group.label}</span>
                    </span>
                    <Badge variant="neutral">{group.totalCount}</Badge>
                  </button>
                ))}
              </div>

              {groupInfos
                .filter((group) => group.isExpanded)
                .map((group) => (
                  <div
                    key={group.key}
                    className="mt-3 divide-y divide-border rounded-lg border border-border bg-border/5"
                  >
                    {group.statuses.map((status) => (
                      <StatusRow
                        key={status}
                        status={status}
                        items={itemsByStatus[status]}
                        isPending={isPending}
                        moveStatus={moveStatus}
                        router={router}
                      />
                    ))}
                  </div>
                ))}
            </div>
          );
        })()}
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
}: {
  status: StatusContratoValue;
  items: ContratoRow[];
  isPending: boolean;
  moveStatus: (id: string, direction: -1 | 1) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const statusIndex = statusOrder.indexOf(status);

  return (
    <div className="p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide">{statusLabels[status]}</h3>
        <Badge variant="neutral">{items.length}</Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
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
              className="w-44 shrink-0 cursor-pointer rounded-md border border-border bg-card p-2 text-xs hover:border-primary/50"
            >
              <p className="truncate font-semibold">{item.contractNumber}</p>
              <p className="truncate text-muted">{item.clienteName}</p>
              <p className="mt-1 font-medium text-primary">{formatCompactCurrency(item.valorUsd, "USD")}</p>
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
                  disabled={isPending || statusIndex === 0}
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
                  disabled={isPending || statusIndex === statusOrder.length - 1}
                  title="Avançar"
                  className="rounded p-0.5 text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="py-3 text-center text-[10px] text-muted">Vazio</p>}
      </div>
    </div>
  );
}
