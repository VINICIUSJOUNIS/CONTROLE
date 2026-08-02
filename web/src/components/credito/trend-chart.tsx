"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { formatBRL, formatPercent, formatDays } from "@/lib/utils";

type Series = { key: string; label: string; color: string };
type Format = "currency" | "percent" | "days";

const formatters: Record<Format, (v: number) => string> = {
  currency: formatBRL,
  percent: (v) => formatPercent(v),
  days: formatDays,
};

export function TrendChart({
  data,
  series,
  format,
}: {
  data: Record<string, string | number | null>[];
  series: Series[];
  format?: Format;
}) {
  const valueFormatter = format ? formatters[format] : undefined;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="periodLabel" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={valueFormatter} width={70} />
        <Tooltip
          formatter={(value) =>
            valueFormatter && typeof value === "number" ? valueFormatter(value) : value
          }
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
