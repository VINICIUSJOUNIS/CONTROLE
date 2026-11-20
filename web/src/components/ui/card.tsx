import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground",
        "shadow-[0_1px_2px_rgba(12,34,38,0.04),0_10px_30px_-18px_rgba(12,34,38,0.18)]",
        "dark:bg-linear-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_32px_-20px_rgba(0,0,0,0.7)]",
        "print:break-inside-avoid print:bg-none print:shadow-none",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-2", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[13px] font-semibold tracking-wide text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}
