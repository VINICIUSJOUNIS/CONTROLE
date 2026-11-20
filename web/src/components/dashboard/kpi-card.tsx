import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";

export type KpiTone = "teal" | "green" | "soft";

// Cada tom define a faixa de destaque no topo do card e o chip do icone
// (fundo translucido da cor + anel sutil, em vez do bloco solido antigo).
const toneVariants: Record<KpiTone, { bar: string; icon: string }> = {
  teal: { bar: "from-primary/90 via-primary/40", icon: "bg-primary/12 text-primary ring-primary/25" },
  green: { bar: "from-success/90 via-success/40", icon: "bg-success/12 text-success ring-success/25" },
  soft: { bar: "from-muted/60 via-muted/20", icon: "bg-accent-soft text-accent-soft-foreground ring-border" },
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
  // Detecta valor negativo pelo "-" que antecede um digito, permitindo
  // simbolos de moeda/espacos entre os dois (ex: "-R$ 1.234,56" do
  // Intl.NumberFormat, "R$ -0,0500" quando o prefixo vem antes do sinal,
  // "-5,2%") pra colorir de vermelho automaticamente, sem precisar de
  // valueClassName em cada tela que usa o card.
  const isNegative = /-[^\d]*\d/.test(value);
  return (
    <Card className="relative overflow-hidden p-4 transition-colors hover:border-primary/40">
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-0.5 bg-linear-to-r to-transparent", variant.bar)}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wider text-muted">{label}</p>
          <p
            className={cn(
              "mt-2 text-xl font-semibold tracking-tight [font-variant-numeric:tabular-nums]",
              isNegative && "text-danger",
              valueClassName
            )}
          >
            {value}
          </p>
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", variant.icon)}>
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
