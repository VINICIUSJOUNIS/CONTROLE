import { ThemeToggle } from "@/components/theme-toggle";
import { Bell } from "lucide-react";
import { ApresentarButton } from "@/components/layout/sidebar-state";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/70 bg-background/70 px-6 py-4 backdrop-blur-xl print:hidden ocultar-em-apresentacao">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <ApresentarButton />
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/60 transition-colors hover:border-primary/40 hover:bg-accent-soft">
          <Bell size={16} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
