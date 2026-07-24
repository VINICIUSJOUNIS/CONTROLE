import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function colorFor(value: number, min: number, max: number) {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  const hue = 145 - t * 145;
  return `hsl(${hue}, 70%, ${88 - t * 38}%)`;
}

export function HeatmapTable({
  title,
  rowLabel,
  rows,
  columns,
  suffix = "%",
}: {
  title: string;
  rowLabel: string;
  rows: { bank: string; values: number[] }[];
  columns: string[];
  suffix?: string;
}) {
  const allValues = rows.flatMap((r) => r.values);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 pr-4 font-medium">{rowLabel}</th>
              {columns.map((c) => (
                <th key={c} className="pb-2 px-2 text-center font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.bank}>
                <td className="py-1 pr-4 font-medium whitespace-nowrap">{row.bank}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="p-1 text-center">
                    <div
                      className="rounded-md py-1.5 text-xs font-medium text-neutral-900"
                      style={{ background: colorFor(v, min, max) }}
                    >
                      {v.toFixed(2)}
                      {suffix}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
