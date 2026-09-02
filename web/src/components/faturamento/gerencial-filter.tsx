"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label, Select } from "@/components/ui/field";

const MESES = [
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

function daysInMonth(year: string, month: string) {
  return new Date(Number(year), Number(month), 0).getDate();
}

export function GerencialFilter({ years }: { years: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? "";
  const month = searchParams.get("month") ?? "";
  const day = searchParams.get("day") ?? "";

  function apply(nextYear: string, nextMonth: string, nextDay: string) {
    const params = new URLSearchParams();
    if (nextYear) params.set("year", nextYear);
    if (nextMonth) params.set("month", nextMonth);
    if (nextDay) params.set("day", nextDay);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-3">
      <div>
        <Label>Ano</Label>
        <Select value={year} onChange={(e) => apply(e.target.value, "", "")} className="w-auto">
          <option value="">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Mês</Label>
        <Select
          value={month}
          onChange={(e) => apply(year, e.target.value, "")}
          disabled={!year}
          className="w-auto"
        >
          <option value="">Todos os meses</option>
          {MESES.map((label, i) => {
            const value = String(i + 1).padStart(2, "0");
            return (
              <option key={value} value={value}>
                {label}
              </option>
            );
          })}
        </Select>
      </div>

      <div>
        <Label>Dia</Label>
        <Select
          value={day}
          onChange={(e) => apply(year, month, e.target.value)}
          disabled={!year || !month}
          className="w-auto"
        >
          <option value="">Todos os dias</option>
          {year &&
            month &&
            Array.from({ length: daysInMonth(year, month) }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
        </Select>
      </div>
    </div>
  );
}
