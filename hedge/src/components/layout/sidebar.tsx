"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldHalf, LogOut, LayoutDashboard, FileText, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contratos", label: "Contratos", icon: FileText },
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
