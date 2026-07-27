"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatPercent } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Series, ValueFormat } from "./line-chart-card";

function applyFormat(value: number, format: ValueFormat) {
  switch (format) {
    case "currency":
      return formatCompactCurrency(value);
    case "percent":
      return formatPercent(value);
    case "rate":
      return `R$ ${value.toFixed(4)}`;
    default:
      return String(value);
  }
}

export function BarChartCard({
  title,
  data,
  xKey,
  series,
  height = 280,
  stacked = false,
  valueFormat = "none",
}: {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  height?: number;
  stacked?: boolean;
  valueFormat?: ValueFormat;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={(value) => applyFormat(Number(value), valueFormat)}
              width={valueFormat === "currency" ? 68 : valueFormat === "rate" ? 84 : 40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => applyFormat(Number(value), valueFormat)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
