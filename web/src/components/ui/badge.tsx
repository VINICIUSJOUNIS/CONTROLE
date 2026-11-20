import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

const variants = {
  default: "bg-primary/10 text-primary ring-primary/25",
  success: "bg-success/10 text-success ring-success/25",
  danger: "bg-danger/10 text-danger ring-danger/25",
  warning: "bg-warning/10 text-warning ring-warning/25",
  neutral: "bg-border/60 text-muted ring-border",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
