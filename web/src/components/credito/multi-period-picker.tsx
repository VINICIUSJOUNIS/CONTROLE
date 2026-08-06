"use client";

import { useRouter, usePathname } from "next/navigation";

export function MultiPeriodPicker({
  periods,
  selectedIds,
}: {
  periods: { id: string; periodLabel: string }[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function toggle(id: string) {
    let next: string[];
    if (selectedIds.includes(id)) {
      next = selectedIds.filter((s) => s !== id);
    } else if (selectedIds.length >= 3) {
      next = [...selectedIds.slice(1), id];
    } else {
      next = [...selectedIds, id];
    }
    router.push(`${pathname}?periods=${next.join(",")}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
      <span className="text-xs font-medium text-muted">Períodos (até 3):</span>
      {periods.map((p) => {
        const active = selectedIds.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className={
              active
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-primary hover:text-foreground"
            }
          >
            {p.periodLabel}
          </button>
        );
      })}
    </div>
  );
}
