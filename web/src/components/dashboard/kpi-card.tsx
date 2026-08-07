import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";

export type KpiTone = "teal" | "green" | "soft";

const toneVariants: Record<KpiTone, { border: string; icon: string }> = {
  teal: { border: "border-l-primary", icon: "bg-primary text-primary-foreground" },
  green: { border: "border-l-success", icon: "bg-success text-success-foreground" },
  soft: { border: "border-l-accent-soft", icon: "bg-accent-soft text-accent-soft-foreground" },
};

export function KpiCard({
  label,
  value,
  valueClassName,
  icon: Icon,
  trend,
  trendLabel,
  trendPositive = true,
  tone = "teal",
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon: LucideIcon;
  trend?: string;
  trendLabel?: string;
  trendPositive?: boolean;
  tone?: KpiTone;
}) {
  const variant = toneVariants[tone];
  // Detecta valor negativo pelo "-" a frente (ex: "-R$ 1.234,56", "-5,2%") pra
  // colorir de vermelho automaticamente, sem precisar de valueClassName em
  // cada tela que usa o card.
  const isNegative = value.trim().startsWith("-");
  return (
    <Card className={cn("border-l-4 p-4", variant.border)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p
            className={cn(
              "mt-1.5 text-xl font-semibold tracking-tight",
              isNegative && "text-danger",
              valueClassName
            )}
          >
            {value}
          </p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", variant.icon)}>
          <Icon size={18} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "flex items-center gap-0.5 font-medium",
              trendPositive ? "text-success" : "text-danger"
            )}
          >
            {trendPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend}
          </span>
          {trendLabel && <span className="text-muted">{trendLabel}</span>}
        </div>
      )}
    </Card>
  );
}
