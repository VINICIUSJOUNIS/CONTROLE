import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type KpiTone = "teal" | "green" | "soft";

const toneBorder: Record<KpiTone, string> = {
  teal: "border-l-primary",
  green: "border-l-success",
  soft: "border-l-accent-soft",
};

export function KpiCard({
  title,
  value,
  hint,
  variacaoPct,
  disponivel = true,
  tone = "teal",
}: {
  title: string;
  value: string;
  hint?: string;
  variacaoPct?: number | null;
  disponivel?: boolean;
  tone?: KpiTone;
}) {
  return (
    <Card className={cn("border-l-4", toneBorder[tone])}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {disponivel ? (
          <>
            <p className="text-2xl font-semibold">{value}</p>
            <div className="mt-1 flex items-center gap-2">
              {hint && <p className="text-xs text-muted">{hint}</p>}
              {variacaoPct != null && (
                <Badge variant={variacaoPct >= 0 ? "success" : "danger"}>
                  {variacaoPct >= 0 ? "+" : ""}
                  {variacaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% YoY
                </Badge>
              )}
            </div>
          </>
        ) : (
          <p className={cn("text-sm text-muted")}>Não disponível</p>
        )}
      </CardContent>
    </Card>
  );
}
