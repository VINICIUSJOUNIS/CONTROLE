"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

function shiftYear(month: string, years: number) {
  if (!month) return month;
  const [y, m] = month.split("-");
  return `${Number(y) + years}-${m}`;
}

export function PeriodComparison() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [fromA, setFromA] = useState(searchParams.get("cmpFromA") ?? "");
  const [toA, setToA] = useState(searchParams.get("cmpToA") ?? "");
  const [fromB, setFromB] = useState(searchParams.get("cmpFromB") ?? "");
  const [toB, setToB] = useState(searchParams.get("cmpToB") ?? "");

  const active = Boolean(
    searchParams.get("cmpFromA") &&
      searchParams.get("cmpToA") &&
      searchParams.get("cmpFromB") &&
      searchParams.get("cmpToB")
  );

  function apply(a: { from: string; to: string }, b: { from: string; to: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cmpFromA", a.from);
    params.set("cmpToA", a.to);
    params.set("cmpFromB", b.from);
    params.set("cmpToB", b.to);
    router.push(`${pathname}?${params.toString()}`);
    setFromA(a.from);
    setToA(a.to);
    setFromB(b.from);
    setToB(b.to);
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cmpFromA");
    params.delete("cmpToA");
    params.delete("cmpFromB");
    params.delete("cmpToB");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setFromA("");
    setToA("");
    setFromB("");
    setToB("");
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-3">
      <div className="flex items-end gap-2">
        <div>
          <Label>Período A — de</Label>
          <Input type="month" value={fromA} onChange={(e) => setFromA(e.target.value)} className="w-auto" />
        </div>
        <div>
          <Label>Período A — até</Label>
          <Input type="month" value={toA} onChange={(e) => setToA(e.target.value)} className="w-auto" />
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div>
          <Label>Período B — de</Label>
          <Input type="month" value={fromB} onChange={(e) => setFromB(e.target.value)} className="w-auto" />
        </div>
        <div>
          <Label>Período B — até</Label>
          <Input type="month" value={toB} onChange={(e) => setToB(e.target.value)} className="w-auto" />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!fromA || !toA}
        onClick={() => {
          setFromB(shiftYear(fromA, -1));
          setToB(shiftYear(toA, -1));
        }}
      >
        Período B = mesmo período, ano anterior
      </Button>

      <Button
        type="button"
        size="sm"
        disabled={!fromA || !toA || !fromB || !toB}
        onClick={() => apply({ from: fromA, to: toA }, { from: fromB, to: toB })}
      >
        Comparar
      </Button>

      {active && (
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Limpar comparação
        </Button>
      )}
    </div>
  );
}
