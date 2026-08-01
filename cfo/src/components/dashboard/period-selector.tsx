"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";

export function PeriodSelector({
  periods,
  selectedId,
}: {
  periods: { id: string; periodLabel: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <Select
      className="w-auto"
      value={selectedId}
      onChange={(e) => router.push(`/?period=${e.target.value}`)}
    >
      {periods.map((p) => (
        <option key={p.id} value={p.id}>
          {p.periodLabel}
        </option>
      ))}
    </Select>
  );
}
