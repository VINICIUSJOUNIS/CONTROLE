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
  MapPin,
  TrendingUp,
  Gauge,
  ShieldCheck,
  Wallet,
  Target,
  ChevronDown,
  AlertTriangle,
  Send,
  Settings2,
  Receipt,
  Undo2,
  Users,
  BarChart3,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { statusLabels, statusToSlug, buildMesaOperacaoSections } from "@/lib/contrato-shared";

type MesaOperacaoSubItem =
  | { kind: "link"; label: string; status: string; href: string }
  | {
      kind: "group";
      label: string;
      children: { label: string; status: string; href: string }[];
    };

const mesaOperacaoSubItems: MesaOperacaoSubItem[] = buildMesaOperacaoSections().map((section) =>
  section.kind === "group"
    ? {
        kind: "group",
        label: section.label,
        children: section.statuses.map((status) => ({
          label: statusLabels[status],
          status,
          href: `/hedge/mesa-operacao/${statusToSlug(status)}`,
        })),
      }
    : {
        kind: "link",
        label: statusLabels[section.status],
        status: section.status,
        href: `/hedge/mesa-operacao/${statusToSlug(section.status)}`,
      }
);

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
  { href: "/faturamento/relatorio", label: "Relatório Comparativo", icon: FileText },
  { href: "/faturamento/relatorio-clientes", label: "Relatório de Clientes", icon: Users },
];

const apresentacaoNavItems = [
  { href: "/faturamento/gerencial", label: "Faturamento", icon: Gauge },
  { href: "/faturamento/gerencial/volume-sacas", label: "Volume de Sacas", icon: Package },
  { href: "/faturamento/gerencial/paises", label: "Países Exportados", icon: MapPin },
  { href: "/faturamento/gerencial/emprestimo-acc", label: "Emprestimo e ACC", icon: Landmark },
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
    subItems: mesaOperacaoSubItems,
  },
  { href: "/hedge/mapa", label: "Mapa de Exportacao", icon: Globe2 },
  { href: "/hedge/operacoes-hedge", label: "Operacoes de Hedge", icon: TrendingUp },
  { href: "/hedge/alertas-prazos", label: "Alerta de Prazos", icon: AlertTriangle },
  { href: "/hedge/cadastros", label: "Cadastros", icon: Settings2 },
];

const planejamentoNavItems = [
  { href: "/planejamento-orcamentario", label: "Planejamento Orçamentário", icon: Target },
];

const transferenciaOrdemNavItems = [
  { href: "/transferencia-ordem", label: "Transferência de Ordem", icon: Send },
];

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  TESOURARIA: "Tesouraria",
  FINANCEIRO: "Financeiro",
  CONSULTA: "Consulta",
};

const modules = [
  { match: (p: string) => p.startsWith("/credito"), label: "Analise de Credito", items: creditoNavItems },
  {
    match: (p: string) => p.startsWith("/faturamento/gerencial"),
    label: "Apresentação",
    items: apresentacaoNavItems,
  },
  { match: (p: string) => p.startsWith("/faturamento"), label: "Faturamento", items: faturamentoNavItems },
  { match: (p: string) => p.startsWith("/hedge"), label: "Controle de Hedge", items: hedgeNavItems },
  {
    match: (p: string) => p.startsWith("/planejamento-orcamentario"),
    label: "Planejamento Orçamentário",
    items: planejamentoNavItems,
  },
  {
    match: (p: string) => p.startsWith("/transferencia-ordem"),
    label: "Transferência de Ordem",
    items: transferenciaOrdemNavItems,
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
  const [expandedSubGroup, setExpandedSubGroup] = useState<string | null>(null);

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
        </div>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {activeModule.items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          const subItems = (item as { subItems?: MesaOperacaoSubItem[] }).subItems;
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
                    if (sub.kind === "group") {
                      const isSubGroupExpanded = expandedSubGroup === sub.label;
                      const groupCount = sub.children.reduce(
                        (total, child) => total + (mesaOperacaoCountByStatus?.[child.status] ?? 0),
                        0
                      );
                      return (
                        <li key={sub.label}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSubGroup(isSubGroupExpanded ? null : sub.label)
                            }
                            title={sub.label}
                            className="flex w-full items-center gap-2 rounded bg-white/5 py-1.5 px-1.5 text-xs font-semibold uppercase tracking-wide text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <ChevronDown
                              size={12}
                              className={cn(
                                "shrink-0 transition-transform",
                                isSubGroupExpanded && "rotate-180"
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate text-left">{sub.label}</span>
                            <span className="shrink-0 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal">
                              {groupCount}
                            </span>
                          </button>
                          {isSubGroupExpanded && (
                            <ul className="mt-0.5 space-y-0.5 border-l border-white/10 pl-4">
                              {sub.children.map((child) => {
                                const childActive = pathname === child.href;
                                const count = mesaOperacaoCountByStatus?.[child.status] ?? 0;
                                return (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      title={child.label}
                                      className={cn(
                                        "flex items-center gap-2 rounded py-1 px-1 text-xs transition-colors",
                                        childActive
                                          ? "text-white"
                                          : "text-sidebar-foreground/70 hover:text-white"
                                      )}
                                    >
                                      <span className="min-w-0 flex-1 truncate">{child.label}</span>
                                      <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">
                                        {count}
                                      </span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    }

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
