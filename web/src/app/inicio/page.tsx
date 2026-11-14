import Link from "next/link";
import Image from "next/image";
import { Landmark, Scale, Receipt, ShieldCheck, Target, Send, Gauge, TrendingUp } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { ControleInatividade } from "@/components/auth/inatividade";

const modules = [
  {
    href: "/",
    label: "Controle de Empréstimos",
    description: "Empréstimos, ACC, fluxo de pagamentos e evolução da dívida.",
    icon: Landmark,
  },
  {
    href: "/credito",
    label: "Análise de Crédito",
    description: "Balanço e DRE mensais lidos do PDF pela IA: capital de giro, liquidez, endividamento e rentabilidade explicados.",
    icon: Scale,
  },
  {
    href: "/faturamento",
    label: "Faturamento",
    description: "Vendas, países exportados e evolução do faturamento.",
    icon: Receipt,
  },
  {
    href: "/hedge",
    label: "Controle de Exportação",
    description: "Contratos de exportação, operações cambiais e vencimentos.",
    icon: ShieldCheck,
  },
  {
    href: "/hedge-cambial",
    label: "Hedge",
    description: "Operações de proteção cambial.",
    icon: TrendingUp,
  },
  {
    href: "/planejamento-orcamentario",
    label: "Planejamento Orçamentário",
    description: "Cenários de receita, despesas por grupo e acompanhamento Previsto x Realizado.",
    icon: Target,
  },
  {
    href: "/transferencia-ordem",
    label: "Transferência de Ordem",
    description: "Carta de transferência de ordem de pagamento do exterior, no papel timbrado.",
    icon: Send,
  },
  {
    href: "/faturamento/gerencial",
    label: "Apresentação",
    description: "Filtros por ano, mês e dia. Faturamento geral, mercado interno e mercado externo.",
    icon: Gauge,
  },
];

export default async function InicioPage() {
  await getCurrentProfile();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ControleInatividade />
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Image
            src="/nayme-logo.png"
            alt="Nayme"
            width={32}
            height={32}
            className="rounded-full"
          />
          <p className="text-sm font-semibold">Controle</p>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={22} />
                </div>
                <h2 className="text-base font-semibold">{m.label}</h2>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
