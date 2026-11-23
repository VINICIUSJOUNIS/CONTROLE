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
  ClipboardList,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  FileSpreadsheet,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-state";
import { createClient } from "@/lib/supabase/client";
import { hedgeCambialAbas } from "@/lib/hedge-cambial-abas";
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
  { href: "/emprestimos", label: "Empréstimos", icon: Landmark },
  { href: "/conta-garantida", label: "Conta Garantida", icon: Wallet },
  { href: "/acc", label: "ACC", icon: Ship },
  { href: "/cambial", label: "Dashboard Cambial", icon: Globe2 },
  { href: "/taxas", label: "Evolução das Taxas", icon: LineChart },
  { href: "/bancos", label: "Comparativo de Bancos", icon: Building2 },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
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
  { href: "/faturamento/gerencial/emprestimo-acc", label: "Empréstimo e ACC", icon: Landmark },
  { href: "/faturamento/gerencial/conta-garantida", label: "Conta Garantida", icon: Wallet },
];

const creditoNavItems = [
  { href: "/credito", label: "Análise de Crédito", icon: LayoutDashboard },
  { href: "/credito/balanco", label: "Balanço", icon: Scale },
  { href: "/credito/dre", label: "DRE", icon: FileSpreadsheet },
  { href: "/credito/comparativo-mensal", label: "Comparativo Mensal", icon: BarChart3 },
  { href: "/credito/trimestre-acumulado", label: "Trimestre Acumulado", icon: CalendarRange },
  { href: "/credito/despesas-fixas", label: "Despesas Fixas", icon: Receipt },
];

const hedgeNavItems = [
  { href: "/hedge", label: "Dashboard", icon: ShieldCheck },
  { href: "/hedge/contratos", label: "Contratos", icon: FileStack },
  { href: "/hedge/contrato-compra", label: "Contrato de Compra", icon: ClipboardList },
  {
    href: "/hedge/mesa-operacao",
    label: "Mesa de Operação",
    icon: Ship,
    subItems: mesaOperacaoSubItems,
  },
  { href: "/hedge/calendario-estufagens", label: "Calendário de Estufagens", icon: CalendarDays },
  { href: "/hedge/contratos-finalizados", label: "Contratos Finalizados", icon: CheckCircle2 },
  { href: "/hedge/mapa", label: "Mapa de Exportação", icon: Globe2 },
  { href: "/hedge/operacoes-hedge", label: "Operações de Hedge", icon: TrendingUp },
  { href: "/hedge/alertas-prazos", label: "Alerta de Prazos", icon: AlertTriangle },
  { href: "/hedge/cadastros", label: "Cadastros", icon: Settings2 },
];

const hedgeCambialNavItems = [
  { href: "/hedge-cambial", label: "Dashboard Hedge", icon: TrendingUp },
  { href: "/hedge-cambial/noticias", label: "ÚLTIMAS NOTÍCIAS", icon: Newspaper },
  { href: "/hedge-cambial/historico-dolar", label: "HISTÓRICO DÓLAR (PTAX)", icon: LineChart },
  ...hedgeCambialAbas.map((a) => ({ href: `/hedge-cambial/${a.slug}`, label: a.label, icon: FileStack })),
];

const planejamentoNavItems = [
  { href: "/planejamento-orcamentario", label: "Orçamento", icon: Target },
  { href: "/planejamento-orcamentario/acompanhamento", label: "Acompanhamento Mensal", icon: CalendarDays },
  { href: "/planejamento-orcamentario/historico-projecoes", label: "Histórico e Projeções", icon: LineChart },
  { href: "/planejamento-orcamentario/premissas", label: "Premissas", icon: Settings2 },
  { href: "/planejamento-orcamentario/tributos", label: "Tributos 2027", icon: Scale },
];

const transferenciaOrdemNavItems = [
  { href: "/transferencia-ordem", label: "Transferência de Ordem", icon: Send },
];

// Armazem e outra empresa: mesmos menus da Analise de Credito, mas paginas
// proprias (vazias ate entrarem os dados do armazem).
const armazemNavItems = [
  { href: "/armazem", label: "Análise de Crédito", icon: LayoutDashboard },
  { href: "/armazem/balanco", label: "Balanço", icon: Scale },
  { href: "/armazem/dre", label: "DRE", icon: FileSpreadsheet },
  { href: "/armazem/comparativo-mensal", label: "Comparativo Mensal", icon: BarChart3 },
  { href: "/armazem/trimestre-acumulado", label: "Trimestre Acumulado", icon: CalendarRange },
  { href: "/armazem/despesas-fixas", label: "Despesas Fixas", icon: Receipt },
];

const comprasNavItems = [{ href: "/compras", label: "Compras", icon: ShoppingCart }];

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  TESOURARIA: "Tesouraria",
  FINANCEIRO: "Financeiro",
  CONSULTA: "Consulta",
};

const modules = [
  { match: (p: string) => p.startsWith("/credito"), label: "Análise de Crédito", items: creditoNavItems },
  {
    match: (p: string) => p.startsWith("/faturamento/gerencial"),
    label: "Apresentação",
    items: apresentacaoNavItems,
  },
  { match: (p: string) => p.startsWith("/faturamento"), label: "Faturamento", items: faturamentoNavItems },
  {
    match: (p: string) => p === "/hedge" || p.startsWith("/hedge/"),
    label: "Controle de Exportação",
    items: hedgeNavItems,
  },
  { match: (p: string) => p.startsWith("/hedge-cambial"), label: "Hedge", items: hedgeCambialNavItems },
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
  { match: (p: string) => p.startsWith("/armazem"), label: "Armazém", items: armazemNavItems },
  { match: (p: string) => p.startsWith("/compras"), label: "Compras", items: comprasNavItems },
];

function getActiveModule(pathname: string) {
  return modules.find((m) => m.match(pathname)) ?? { label: "Controle de Empréstimos", items: navItems };
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
  // Item ativo = o de caminho mais especifico que contem a pagina atual.
  const activeHref = activeModule.items
    .filter(
      (item) =>
        pathname === item.href ||
        (item.href !== "/" && item.href !== "/hedge-cambial" && pathname.startsWith(item.href + "/"))
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedSubGroup, setExpandedSubGroup] = useState<string | null>(null);
  const { aberta, alternar, apresentando } = useSidebar();
  // Recolhido, o menu vira uma faixa estreita so com os icones.
  const recolhido = !aberta;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-white/5 bg-sidebar bg-linear-to-b from-white/[0.03] to-transparent text-sidebar-foreground transition-[width] md:flex print:hidden",
        recolhido ? "w-16" : "w-64",
        apresentando && "md:hidden"
      )}
    >
      <div className={cn("flex items-center py-4", recolhido ? "justify-center px-2" : "justify-between pl-5 pr-3")}>
        {!recolhido && (
          <p className="truncate text-xs font-semibold tracking-wider text-white/90">{activeModule.label}</p>
        )}
        <button
          type="button"
          onClick={alternar}
          title={recolhido ? "Expandir menu" : "Recolher menu"}
          aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
          className="rounded-lg p-1.5 text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
        >
          {recolhido ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <nav className={cn("flex-1 space-y-1 overflow-y-auto py-2", recolhido ? "px-2" : "px-3")}>
        {activeModule.items.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          const subItems = (item as { subItems?: MesaOperacaoSubItem[] }).subItems;
          const isExpanded = expanded === item.href;
          return (
            <div key={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg pr-2 text-sm transition-colors",
                  active
                    ? "relative bg-[#3fc6ce]/12 text-white ring-1 ring-inset ring-[#3fc6ce]/20 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-[#3fc6ce]"
                    : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white"
                )}
              >
                <Link
                  href={item.href}
                  title={recolhido ? item.label : undefined}
                  className={cn("relative flex flex-1 items-center gap-3 py-2.5", recolhido ? "justify-center px-0" : "px-3")}
                >
                  <Icon size={17} className="shrink-0" />
                  {recolhido ? (
                    item.href === "/hedge/alertas-prazos" &&
                    !!alertasPrazosCount && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
                  ) : (
                    item.label
                  )}
                  {!recolhido && subItems && mesaOperacaoCount != null && (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium">
                      {mesaOperacaoCount}
                    </span>
                  )}
                  {!recolhido && item.href === "/hedge/alertas-prazos" && !!alertasPrazosCount && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white">
                      {alertasPrazosCount}
                    </span>
                  )}
                </Link>
                {subItems && !recolhido && (
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
              {subItems && isExpanded && !recolhido && (
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
      <div className={cn("border-t border-white/10 py-3", recolhido ? "flex justify-center px-2" : "px-4")}>
        {!recolhido && <p className="text-xs font-medium text-white">{roleLabels[profile.role] ?? profile.role}</p>}
        <button
          onClick={handleSignOut}
          title="Sair"
          className={cn("flex items-center gap-1.5 text-xs text-sidebar-foreground/70 hover:text-white", !recolhido && "mt-2")}
        >
          <LogOut size={recolhido ? 16 : 13} />
          {!recolhido && "Sair"}
        </button>
      </div>
    </aside>
  );
}
