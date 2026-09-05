import Link from "next/link";
import Image from "next/image";
import { Landmark, Scale, Receipt, ShieldCheck, Target, Send, Gauge } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const modules = [
  {
    href: "/",
    label: "Controle de Emprestimos",
    description: "Emprestimos, ACC, fluxo de pagamentos e evolucao da divida.",
    icon: Landmark,
  },
  {
    href: "/credito",
    label: "Analise de Credito",
    description: "Balanco patrimonial, DRE, fluxo de caixa e indicadores.",
    icon: Scale,
  },
  {
    href: "/faturamento",
    label: "Faturamento",
    description: "Vendas, paises exportados e evolucao do faturamento.",
    icon: Receipt,
  },
  {
    href: "/hedge",
    label: "Controle de Hedge",
    description: "Contratos de exportacao, operacoes cambiais e vencimentos.",
    icon: ShieldCheck,
  },
  {
    href: "/planejamento-orcamentario",
    label: "Planejamento Orçamentário",
    description: "Cenarios de receita, despesas por grupo e acompanhamento Previsto x Realizado.",
    icon: Target,
  },
  {
    href: "/transferencia-ordem",
    label: "Transferência de Ordem",
    description: "Carta de transferencia de ordem de pagamento do exterior, no papel timbrado.",
    icon: Send,
  },
  {
    href: "/faturamento/gerencial",
    label: "Apresentação",
    description: "Filtros por ano, mes e dia. Faturamento geral, mercado interno e mercado externo.",
    icon: Gauge,
  },
];

export default async function InicioPage() {
  await getCurrentProfile();

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
