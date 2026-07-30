"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthsAgo(count: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PeriodFilter({ years }: { years: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function apply(nextFrom?: string, nextTo?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setCustomFrom(nextFrom ?? "");
    setCustomTo(nextTo ?? "");
  }

  const activeYear =
    from && to && from.endsWith("-01") && to.endsWith("-12") && from.slice(0, 4) === to.slice(0, 4)
      ? from.slice(0, 4)
      : "todos";

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-3">
      <div>
        <Label>Ano</Label>
        <Select
          value={activeYear}
          onChange={(e) => {
            const year = e.target.value;
            if (year === "todos") apply();
            else apply(`${year}-01`, `${year}-12`);
          }}
          className="w-auto"
        >
          <option value="todos">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => apply(monthsAgo(12), currentMonth())}>
          Ultimos 12 meses
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => apply(monthsAgo(24), currentMonth())}>
          Ultimos 24 meses
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => apply()}>
          Tudo
        </Button>
      </div>

      <div className="flex items-end gap-2">
        <div>
          <Label>De</Label>
          <Input
            type="month"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-auto"
          />
        </div>
        <div>
          <Label>Ate</Label>
          <Input
            type="month"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => apply(customFrom || undefined, customTo || undefined)}
        >
          Aplicar periodo
        </Button>
      </div>
    </div>
  );
}
