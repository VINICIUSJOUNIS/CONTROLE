"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency, formatPercent } from "@/lib/format";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type Series = {
  key: string;
  name: string;
  color: string;
  unit?: string;
};

export type ValueFormat = "currency" | "percent" | "rate" | "none";

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

export function LineChartCard({
  title,
  data,
  xKey,
  series,
  height = 280,
  valueFormat = "none",
  lineType = "monotone",
}: {
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  height?: number;
  valueFormat?: ValueFormat;
  lineType?: "monotone" | "linear";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickFormatter={(value) => applyFormat(Number(value), valueFormat)}
              width={valueFormat === "currency" ? 96 : valueFormat === "rate" ? 84 : 40}
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
              <Line
                key={s.key}
                type={lineType}
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={(dotProps: { cx?: number; cy?: number; index?: number; value?: number }) => {
                  const { cx, cy, index, value } = dotProps;
                  if (typeof value === "number" && value < 0 && cx != null && cy != null) {
                    return <circle key={`${s.key}-${index}`} cx={cx} cy={cy} r={3} fill="var(--color-danger)" />;
                  }
                  return <circle key={`${s.key}-${index}`} cx={cx} cy={cy} r={0} fill="none" />;
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
