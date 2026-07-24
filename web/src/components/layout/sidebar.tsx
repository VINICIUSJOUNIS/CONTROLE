"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  Ship,
  Globe2,
  LineChart,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard Executivo", icon: LayoutDashboard },
  { href: "/emprestimos", label: "Emprestimos", icon: Landmark },
  { href: "/acc", label: "ACC", icon: Ship },
  { href: "/cambial", label: "Dashboard Cambial", icon: Globe2 },
  { href: "/taxas", label: "Evolucao das Taxas", icon: LineChart },
  { href: "/bancos", label: "Comparativo de Bancos", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          CT
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Central de Tesouraria</p>
          <p className="text-xs text-sidebar-foreground/70">Emprestimos &amp; ACC</p>
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
      <div className="px-5 py-4 text-xs text-sidebar-foreground/50">
        v0.1 - Prototipo com dados de exemplo
      </div>
    </aside>
  );
}
