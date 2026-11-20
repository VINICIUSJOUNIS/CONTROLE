import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground transition-[border-color,box-shadow] duration-200",
        "shadow-[0_1px_2px_rgba(12,34,38,0.05),0_12px_32px_-20px_rgba(12,34,38,0.22)] hover:border-primary/25",
        "dark:bg-linear-to-b dark:from-white/[0.045] dark:via-white/[0.015] dark:to-transparent",
        "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_40px_-24px_rgba(0,0,0,0.8)]",
        "print:break-inside-avoid print:bg-none print:shadow-none",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-2", className)} {...props} />;
}

// Titulo com um marcador vertical na cor principal antes do texto - da
// hierarquia ao card sem precisar de icone em cada tela.
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "flex items-center gap-2 text-[13px] font-semibold tracking-wide text-foreground/90",
        "before:h-3.5 before:w-1 before:shrink-0 before:rounded-full before:bg-linear-to-b before:from-primary before:to-primary/40 before:content-['']",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}
