import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:brightness-110",
  outline: "border border-border bg-card/60 hover:border-primary/40 hover:bg-accent-soft",
  ghost: "bg-transparent hover:bg-accent-soft",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  icon: "h-9 w-9",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
