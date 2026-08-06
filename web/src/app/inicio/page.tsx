import Link from "next/link";
import Image from "next/image";
import { Landmark, Scale, Receipt, ArrowRight } from "lucide-react";
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
];

export default async function InicioPage() {
  const profile = await getCurrentProfile();

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
          <div>
            <p className="text-sm font-semibold">Controle</p>
            <p className="text-xs text-muted">Central de Tesouraria</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Selecione um modulo</h1>
          <p className="mt-1 text-sm text-muted">{profile.email}</p>
        </div>

        <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary"
              >
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={22} />
                  </div>
                  <h2 className="text-base font-semibold">{m.label}</h2>
                  <p className="mt-1.5 text-sm text-muted">{m.description}</p>
                </div>
                <div className="mt-6 flex items-center gap-1 text-sm font-medium text-primary">
                  Acessar
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
