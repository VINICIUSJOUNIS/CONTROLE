import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { ControleInatividade } from "@/components/auth/inatividade";
import { CabecalhoModulos } from "@/components/layout/cabecalho-modulos";
import { MODULOS } from "@/lib/modulos";

export default async function InicioPage() {
  await getCurrentProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <ControleInatividade />
      <CabecalhoModulos comTema />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
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
