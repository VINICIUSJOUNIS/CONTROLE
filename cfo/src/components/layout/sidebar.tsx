"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, FileStack, Upload, Scale, FileBarChart, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard Executivo", icon: LayoutDashboard },
  { href: "/balanco", label: "Balanço Patrimonial", icon: Scale },
  { href: "/dre", label: "DRE", icon: FileBarChart },
  { href: "/fluxo-de-caixa", label: "Fluxo de Caixa", icon: Waves },
  { href: "/indicadores", label: "Indicadores", icon: LineChart },
  { href: "/balancetes", label: "Balancetes", icon: FileStack },
  { href: "/importar", label: "Novo Balancete", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground print:hidden">
      <div className="flex items-center gap-2 px-5 py-5">
        <div>
          <p className="text-sm font-semibold text-white">CFO</p>
          <p className="text-xs text-sidebar-foreground/70">Analise de Balanco</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-active text-white"
                  : "hover:bg-sidebar-active/60 hover:text-white"
              )}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
