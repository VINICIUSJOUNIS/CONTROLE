"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card/85 px-4 backdrop-blur-xl print:hidden ocultar-em-apresentacao">
      <Link href="/inicio" title="Início" className="flex shrink-0 items-center gap-2.5">
        <Image src="/nayme-logo.png" alt="Nayme" width={30} height={30} className="rounded-full" />
        <span className="hidden text-sm font-semibold tracking-wide 2xl:inline">Controle</span>
      </Link>
      <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
      {/* 8 colunas de largura igual: os modulos ficam alinhados e com o mesmo
          espaco entre si, independente do tamanho do nome. */}
      <nav className="grid min-w-0 flex-1 grid-cols-[repeat(8,minmax(7.5rem,1fr))] items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
    </header>
  );
}
