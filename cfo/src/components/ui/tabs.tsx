"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-10 items-center gap-1 rounded-lg border border-border bg-card p-1",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted transition-colors",
        "hover:text-foreground",
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 space-y-4", className)} {...props} />;
}
