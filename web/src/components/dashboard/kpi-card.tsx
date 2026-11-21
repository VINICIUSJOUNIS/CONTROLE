import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";

export type KpiTone = "teal" | "green" | "soft";

// Cada tom define: a linha de destaque no topo, o brilho difuso no canto e o
// chip do icone (degrade translucido da cor + anel sutil).
const toneVariants: Record<KpiTone, { bar: string; glow: string; icon: string }> = {
  teal: {
    bar: "from-primary via-primary/50",
    glow: "bg-primary/20",
    icon: "from-primary/25 to-primary/5 text-primary ring-primary/30",
  },
  green: {
    bar: "from-success via-success/50",
    glow: "bg-success/20",
    icon: "from-success/25 to-success/5 text-success ring-success/30",
  },
  soft: {
    bar: "from-muted/70 via-muted/25",
    glow: "bg-muted/15",
    icon: "from-accent-soft to-accent-soft/40 text-accent-soft-foreground ring-border",
  },
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
    <Card className="group relative isolate overflow-hidden p-5 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_40px_-22px_var(--primary)] print:transform-none">
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-[3px] bg-linear-to-r to-transparent", variant.bar)}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 -z-10 h-36 w-36 rounded-full opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100 print:hidden",
          variant.glow
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 pt-1 text-[11px] font-semibold tracking-[0.08em] text-muted">{label}</p>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ring-1 ring-inset transition-transform duration-300 group-hover:scale-105",
            variant.icon
          )}
        >
          <Icon size={19} strokeWidth={2} />
        </div>
      </div>
      <p
        className={cn(
          "mt-3 break-words text-[22px] font-semibold leading-tight tracking-tight [font-variant-numeric:tabular-nums]",
          isNegative && "text-danger",
          valueClassName
        )}
      >
        {value}
      </p>
      {(trend || trendLabel) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset",
                trendPositive ? "bg-success/10 text-success ring-success/25" : "bg-danger/10 text-danger ring-danger/25"
              )}
            >
              {trendPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {trend}
            </span>
          )}
          {trendLabel && <span className="text-[11px] text-muted">{trendLabel}</span>}
        </div>
      )}
    </Card>
  );
}
