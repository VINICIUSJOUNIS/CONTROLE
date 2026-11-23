"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { MODULOS, moduloAtivo } from "@/lib/modulos";
import { ThemeToggle } from "@/components/theme-toggle";

// Cabecalho fixo com os modulos do sistema (os mesmos cards da tela Inicio).
// Clicar num modulo abre a pagina inicial dele logo abaixo; o menu lateral
// mostra as paginas do modulo selecionado. Altura fixa (h-14 = 3.5rem):
// o menu lateral e a barra de titulo de cada pagina grudam logo abaixo dele.
export function CabecalhoModulos({ comTema = false }: { comTema?: boolean }) {
  const pathname = usePathname();
  const ativo = moduloAtivo(pathname);
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  // Sair do sistema: encerra a sessao no Supabase e volta para a tela de
  // entrada. Fica no cabecalho para estar em todas as telas (a Inicio nao tem
  // menu lateral, onde ficava o unico "Sair").
  async function sair() {
    setSaindo(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card/85 px-4 backdrop-blur-xl print:hidden ocultar-em-apresentacao">
      <Link href="/inicio" title="Início" className="flex shrink-0 items-center gap-2.5">
        {/* Logo da marca (arte com a frase), 957x328 - exibida a 40px de altura. */}
        <Image
          src="/nayme-logo-banner.png"
          alt="Nayme - The future of coffee follows its origins"
          width={117}
          height={40}
          priority
          className="h-10 w-auto rounded-md ring-1 ring-white/10"
        />
      </Link>
      <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
      {/* Uma coluna de largura igual por modulo (grid-flow-col: sempre numa
          linha so, qualquer que seja a quantidade de modulos). */}
      <nav className="grid min-w-0 flex-1 grid-flow-col auto-cols-[minmax(7.5rem,1fr)] items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MODULOS.map((m) => {
          const Icon = m.icon;
          const selecionado = ativo?.href === m.href;
          return (
            <Link
              key={m.href}
              href={m.href}
              title={m.description}
              aria-current={selecionado ? "page" : undefined}
              className={cn(
                "relative flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-[11px] leading-tight font-semibold transition-colors",
                selecionado
                  ? "bg-primary/12 text-primary ring-1 ring-inset ring-primary/25"
                  : "text-muted hover:bg-accent-soft hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                  selecionado ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                )}
              >
                <Icon size={14} />
              </span>
              <span className="min-w-0">{m.label}</span>
            </Link>
          );
        })}
      </nav>
      {comTema && <ThemeToggle />}
      <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
      <button
        type="button"
        onClick={sair}
        disabled={saindo}
        title="Sair do sistema"
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-60"
      >
        {saindo ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
        Sair
      </button>
    </header>
  );
}
