"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldHalf,
  LogOut,
  LayoutDashboard,
  FileText,
  Globe2,
  Workflow,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { statusOrder, statusLabels } from "@/lib/contrato-shared";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contratos", label: "Contratos", icon: FileText },
  {
    href: "/mesa-operacao",
    label: "Mesa de Operacao",
    icon: Workflow,
    subItems: statusOrder.map((status) => statusLabels[status]),
  },
  { href: "/mapa", label: "Mapa de Exportacao", icon: Globe2 },
  { href: "/operacoes-hedge", label: "Operacoes de Hedge", icon: ShieldHalf },
];

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  TESOURARIA: "Tesouraria",
  FINANCEIRO: "Financeiro",
  CONSULTA: "Consulta",
};

export function Sidebar({ profile }: { profile: { email: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground print:hidden">
      <div className="flex items-center gap-2 px-5 py-5">
        <div>
          <p className="text-sm font-semibold text-white">Hedge</p>
          <p className="text-xs text-sidebar-foreground/70">Hedge Cambial</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const isExpanded = expanded === item.href;
          return (
            <div key={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg pr-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-active text-white"
                    : "hover:bg-sidebar-active/60 hover:text-white"
                )}
              >
                <Link href={item.href} className="flex flex-1 items-center gap-3 px-3 py-2.5">
                  <Icon size={17} />
                  {item.label}
                </Link>
                {item.subItems && (
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : item.href)}
                    aria-label={isExpanded ? "Recolher etapas" : "Expandir etapas"}
                    className="rounded p-1 hover:bg-white/10"
                  >
                    <ChevronDown
                      size={15}
                      className={cn("transition-transform", isExpanded && "rotate-180")}
                    />
                  </button>
                )}
              </div>
              {item.subItems && isExpanded && (
                <ul className="mt-1 space-y-0.5 border-l border-white/10 pl-6">
                  {item.subItems.map((label) => (
                    <li
                      key={label}
                      className="truncate py-1 text-xs text-sidebar-foreground/70"
                      title={label}
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-xs font-medium text-white">
          {roleLabels[profile.role] ?? profile.role}
        </p>
        <button
          onClick={handleSignOut}
          className="mt-2 flex items-center gap-1.5 text-xs text-sidebar-foreground/70 hover:text-white"
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </aside>
  );
}
