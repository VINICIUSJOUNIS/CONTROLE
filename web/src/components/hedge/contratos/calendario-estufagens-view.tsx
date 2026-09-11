"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { Calendar, ChevronLeft, ChevronRight, Ship } from "lucide-react";

export type CalendarioContratoRow = {
  id: string;
  contractNumber: string;
  clienteName: string;
  dataEstufagem: string | null;
  dataEmbarque: string | null;
  quantSacas: number | null;
};

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatSacas(value: number) {
  return value.toLocaleString("pt-BR");
}

export function CalendarioEstufagensView({ contratos }: { contratos: CalendarioContratoRow[] }) {
  const hoje = new Date();
  const [cursor, setCursor] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const estufagensPorDia = useMemo(() => {
    const map = new Map<string, CalendarioContratoRow[]>();
    for (const c of contratos) {
      if (!c.dataEstufagem) continue;
      const arr = map.get(c.dataEstufagem) ?? [];
      arr.push(c);
      map.set(c.dataEstufagem, arr);
    }
    return map;
  }, [contratos]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    return Array.from({ length: total }, (_, i) => {
      const day = i - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return null;
      const iso = toISODate(year, month, day);
      const isHoje =
        year === hoje.getFullYear() && month === hoje.getMonth() && day === hoje.getDate();
      return { day, iso, isHoje, itens: estufagensPorDia.get(iso) ?? [] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, estufagensPorDia]);

  const totalSacasMes = useMemo(
    () =>
      cells.reduce(
        (sum, cell) => sum + (cell?.itens.reduce((s, c) => s + (c.quantSacas ?? 0), 0) ?? 0),
        0
      ),
    [cells]
  );

  const embarquesDoMes = useMemo(() => {
    return contratos
      .filter((c) => c.dataEmbarque && c.dataEmbarque.startsWith(`${year}-${pad(month + 1)}`))
      .sort((a, b) => (a.dataEmbarque ?? "").localeCompare(b.dataEmbarque ?? ""));
  }, [contratos, year, month]);

  const mesLabel = `${meses[month]} ${year}`;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Calendário de Estufagens</h2>
              <p className="text-xs text-muted">Datas de estufagem dos contratos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-border/40"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="w-32 text-center text-sm font-medium">{mesLabel}</span>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-border/40"
              aria-label="Próximo mês"
            >
              <ChevronRight size={15} />
            </button>
            <button
              onClick={() => setCursor(new Date(hoje.getFullYear(), hoje.getMonth(), 1))}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-border/40"
            >
              Hoje
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border text-center text-xs font-medium text-muted">
          {diasSemana.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, i) =>
            cell === null ? (
              <div key={i} className="min-h-[90px] border-b border-r border-border bg-border/10 last:border-r-0" />
            ) : (
              <div
                key={i}
                className={`min-h-[90px] border-b border-r border-border p-1.5 last:border-r-0 ${
                  cell.isHoje ? "bg-success/5 ring-1 ring-inset ring-success/40" : ""
                }`}
              >
                <p className="text-right text-xs text-muted">{cell.day}</p>
                <div className="mt-1 space-y-1">
                  {cell.itens.map((item) => (
                    <p
                      key={item.id}
                      title={`${item.contractNumber} · ${item.clienteName}`}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        cell.isHoje ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                      }`}
                    >
                      {item.contractNumber} · {formatSacas(item.quantSacas ?? 0)}sc
                    </p>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 p-3 text-sm">
          <span className="text-muted">Total de sacas em {meses[month].toLowerCase()}:</span>
          <span className="font-semibold text-primary">{formatSacas(totalSacasMes)} sacas</span>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Ship size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">
            Embarques em {meses[month].toLowerCase()} ({embarquesDoMes.length})
          </h2>
        </div>
        {embarquesDoMes.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted">Nenhum embarque previsto neste mês.</p>
        ) : (
          <ul className="divide-y divide-border">
            {embarquesDoMes.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.contractNumber}</p>
                  <p className="truncate text-xs text-muted">{item.clienteName}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted">
                  <p>{formatDate(item.dataEmbarque!)}</p>
                  <p>{formatSacas(item.quantSacas ?? 0)} sc</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
