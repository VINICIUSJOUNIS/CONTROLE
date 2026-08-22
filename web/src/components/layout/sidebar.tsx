"use client";

import { useState } from "react";
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
  FileStack,
  Receipt,
  MapPin,
  Undo2,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Wallet,
  Target,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { statusOrder, statusLabels, statusToSlug } from "@/lib/contrato-shared";

const navItems = [
  { href: "/", label: "Dashboard Executivo", icon: LayoutDashboard },
  { href: "/emprestimos", label: "Emprestimos", icon: Landmark },
  { href: "/conta-garantida", label: "Conta Garantida", icon: Wallet },
  { href: "/acc", label: "ACC", icon: Ship },
  { href: "/cambial", label: "Dashboard Cambial", icon: Globe2 },
  { href: "/taxas", label: "Evolucao das Taxas", icon: LineChart },
  { href: "/bancos", label: "Comparativo de Bancos", icon: Building2 },
  { href: "/relatorios", label: "Relatorios", icon: FileText },
];

const faturamentoNavItems = [
  { href: "/faturamento", label: "Dashboard de Faturamento", icon: LayoutDashboard },
  { href: "/faturamento/vendas", label: "Vendas", icon: Receipt },
  { href: "/faturamento/devolucoes", label: "Devoluções", icon: Undo2 },
  { href: "/faturamento/paises", label: "Países Exportados", icon: MapPin },
  { href: "/faturamento/curva-abc", label: "Curva ABC", icon: BarChart3 },
];

const creditoNavItems = [
  { href: "/credito", label: "Analise de Balanco", icon: LayoutDashboard },
  { href: "/credito/balancetes", label: "Balanço e DRE", icon: FileStack },
];

const hedgeNavItems = [
  { href: "/hedge", label: "Dashboard", icon: ShieldCheck },
  { href: "/hedge/contratos", label: "Contratos", icon: FileStack },
  {
    href: "/hedge/mesa-operacao",
    label: "Mesa de Operacao",
    icon: Ship,
    subItems: statusOrder.map((status) => ({
      label: statusLabels[status],
      status,
      href: `/hedge/mesa-operacao/${statusToSlug(status)}`,
    })),
  },
  { href: "/hedge/mapa", label: "Mapa de Exportacao", icon: Globe2 },
  { href: "/hedge/operacoes-hedge", label: "Operacoes de Hedge", icon: TrendingUp },
  { href: "/hedge/alertas-prazos", label: "Alerta de Prazos", icon: AlertTriangle },
];

const planejamentoNavItems = [
  { href: "/planejamento-orcamentario", label: "Planejamento Orçamentário", icon: Target },
];

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  TESOURARIA: "Tesouraria",
  FINANCEIRO: "Financeiro",
  CONSULTA: "Consulta",
};

const modules = [
  { match: (p: string) => p.startsWith("/credito"), label: "Analise de Credito", items: creditoNavItems },
  { match: (p: string) => p.startsWith("/faturamento"), label: "Faturamento", items: faturamentoNavItems },
  { match: (p: string) => p.startsWith("/hedge"), label: "Controle de Hedge", items: hedgeNavItems },
  {
    match: (p: string) => p.startsWith("/planejamento-orcamentario"),
    label: "Planejamento Orçamentário",
    items: planejamentoNavItems,
  },
];

function getActiveModule(pathname: string) {
  return modules.find((m) => m.match(pathname)) ?? { label: "Controle de Emprestimos", items: navItems };
}

export function Sidebar({
  profile,
  mesaOperacaoCount,
  mesaOperacaoCountByStatus,
  alertasPrazosCount,
}: {
  profile: { email: string; role: string };
  mesaOperacaoCount?: number;
  mesaOperacaoCountByStatus?: Record<string, number>;
  alertasPrazosCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeModule = getActiveModule(pathname);
  const [expanded, setExpanded] = useState<string | null>(null);

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
          <p className="text-xs text-sidebar-foreground/70">{activeModule.label}</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {activeModule.items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          const subItems = (item as { subItems?: { label: string; href: string; status: string }[] })
            .subItems;
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
                  {subItems && mesaOperacaoCount != null && (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium">
                      {mesaOperacaoCount}
                    </span>
                  )}
                  {item.href === "/hedge/alertas-prazos" && !!alertasPrazosCount && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white">
                      {alertasPrazosCount}
                    </span>
                  )}
                </Link>
                {subItems && (
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
              {subItems && isExpanded && (
                <ul className="mt-1 space-y-0.5 border-l border-white/10 pl-6">
                  {subItems.map((sub) => {
                    const subActive = pathname === sub.href;
                    const count = mesaOperacaoCountByStatus?.[sub.status] ?? 0;
                    return (
                      <li key={sub.href}>
                        <Link
                          href={sub.href}
                          title={sub.label}
                          className={cn(
                            "flex items-center gap-2 rounded py-1 px-1 text-xs transition-colors",
                            subActive
                              ? "text-white"
                              : "text-sidebar-foreground/70 hover:text-white"
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{sub.label}</span>
                          <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">
                            {count}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
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
