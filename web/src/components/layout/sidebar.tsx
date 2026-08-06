"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  Ship,
  Globe2,
  LineChart,
  Building2,
  FileText,
  LogOut,
  Scale,
  FileBarChart,
  Waves,
  FileStack,
  Receipt,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/", label: "Dashboard Executivo", icon: LayoutDashboard },
  { href: "/emprestimos", label: "Emprestimos", icon: Landmark },
  { href: "/acc", label: "ACC", icon: Ship },
  { href: "/cambial", label: "Dashboard Cambial", icon: Globe2 },
  { href: "/taxas", label: "Evolucao das Taxas", icon: LineChart },
  { href: "/bancos", label: "Comparativo de Bancos", icon: Building2 },
  { href: "/relatorios", label: "Relatorios", icon: FileText },
];

const faturamentoNavItems = [
  { href: "/faturamento", label: "Dashboard de Faturamento", icon: LayoutDashboard },
  { href: "/faturamento/vendas", label: "Vendas", icon: Receipt },
  { href: "/faturamento/paises", label: "Países Exportados", icon: MapPin },
];

const creditoNavItems = [
  { href: "/credito", label: "Dashboard de Credito", icon: LayoutDashboard },
  { href: "/credito/balanco", label: "Balanco Patrimonial", icon: Scale },
  { href: "/credito/dre", label: "DRE", icon: FileBarChart },
  { href: "/credito/fluxo-de-caixa", label: "Fluxo de Caixa", icon: Waves },
  { href: "/credito/indicadores", label: "Indicadores", icon: LineChart },
  { href: "/credito/balancetes", label: "Balancetes", icon: FileStack },
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
      <Link href="/inicio" className="flex items-center gap-2 px-5 py-5">
        <div>
          <p className="text-sm font-semibold text-white">Controle</p>
          <p className="text-xs text-sidebar-foreground/70">Central de Tesouraria</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
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

        <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
          Analise de Credito
        </p>
        {creditoNavItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/credito" && pathname.startsWith(item.href + "/"));
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

        <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
          Faturamento
        </p>
        {faturamentoNavItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/faturamento" && pathname.startsWith(item.href + "/"));
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
