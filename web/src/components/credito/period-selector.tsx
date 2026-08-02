"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select } from "@/components/ui/field";

export function PeriodSelector({
  periods,
  selectedId,
}: {
  periods: { id: string; periodLabel: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      className="w-auto"
      value={selectedId}
      onChange={(e) => router.push(`${pathname}?period=${e.target.value}`)}
    >
      {periods.map((p) => (
        <option key={p.id} value={p.id}>
          {p.periodLabel}
        </option>
      ))}
    </Select>
  );
}
