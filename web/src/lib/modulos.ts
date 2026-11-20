import { Landmark, Scale, Receipt, ShieldCheck, Target, Send, Gauge, TrendingUp, type LucideIcon } from "lucide-react";

// Modulos do sistema: cards da tela Inicio e abas do cabecalho fixo. `match`
// diz se uma rota pertence ao modulo; a ordem de verificacao fica em
// moduloAtivo (o mais especifico primeiro - Apresentacao antes de
// Faturamento, Hedge antes de Controle de Exportacao). Controle de
// Emprestimos e o padrao para as rotas sem prefixo proprio ("/", "/acc"...).
export type Modulo = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
};

export const MODULOS: Modulo[] = [
  {
    href: "/",
    label: "Controle de Empréstimos",
    description: "Empréstimos, ACC, fluxo de pagamentos e evolução da dívida.",
    icon: Landmark,
    match: () => false,
  },
  {
    href: "/credito",
    label: "Análise de Crédito",
    description: "Balanço e DRE mensais lidos do PDF pela IA: capital de giro, liquidez, endividamento e rentabilidade explicados.",
    icon: Scale,
    match: (p) => p.startsWith("/credito"),
  },
  {
    href: "/faturamento",
    label: "Faturamento",
    description: "Vendas, países exportados e evolução do faturamento.",
    icon: Receipt,
    match: (p) => p.startsWith("/faturamento") && !p.startsWith("/faturamento/gerencial"),
  },
  {
    href: "/hedge",
    label: "Controle de Exportação",
    description: "Contratos de exportação, operações cambiais e vencimentos.",
    icon: ShieldCheck,
    match: (p) => p === "/hedge" || p.startsWith("/hedge/"),
  },
  {
    href: "/hedge-cambial",
    label: "Hedge",
    description: "Operações de proteção cambial.",
    icon: TrendingUp,
    match: (p) => p.startsWith("/hedge-cambial"),
  },
  {
    href: "/planejamento-orcamentario",
    label: "Planejamento Orçamentário",
    description: "Cenários de receita, despesas por grupo e acompanhamento Previsto x Realizado.",
    icon: Target,
    match: (p) => p.startsWith("/planejamento-orcamentario"),
  },
  {
    href: "/transferencia-ordem",
    label: "Transferência de Ordem",
    description: "Carta de transferência de ordem de pagamento do exterior, no papel timbrado.",
    icon: Send,
    match: (p) => p.startsWith("/transferencia-ordem"),
  },
  {
    href: "/faturamento/gerencial",
    label: "Apresentação",
    description: "Filtros por ano, mês e dia. Faturamento geral, mercado interno e mercado externo.",
    icon: Gauge,
    match: (p) => p.startsWith("/faturamento/gerencial"),
  },
];

// Modulo da rota atual; null na tela Inicio (nenhum selecionado).
export function moduloAtivo(pathname: string): Modulo | null {
  if (pathname.startsWith("/inicio")) return null;
  return MODULOS.find((m) => m.match(pathname)) ?? MODULOS[0];
}
