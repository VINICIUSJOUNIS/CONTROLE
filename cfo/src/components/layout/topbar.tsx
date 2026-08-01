import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur print:hidden">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <ThemeToggle />
    </header>
  );
}
