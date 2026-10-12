"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Minimize2, PanelLeftClose, PanelLeftOpen, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";

// Estado da moldura do sistema, compartilhado entre Sidebar e Topbar:
// - menu lateral aberto/fechado (lembrado neste navegador, vale para todos os modulos)
// - modo apresentacao: tela cheia, sem menu e sem barra superior.
const CHAVE = "controle:menu-lateral-aberto";
const EVENTO = "controle:menu-lateral";

function lerAberta() {
  try {
    return localStorage.getItem(CHAVE) !== "0";
  } catch {
    return true;
  }
}
function assinar(aviso: () => void) {
  window.addEventListener(EVENTO, aviso);
  window.addEventListener("storage", aviso);
  return () => {
    window.removeEventListener(EVENTO, aviso);
    window.removeEventListener("storage", aviso);
  };
}

type Estado = { aberta: boolean; alternar: () => void; apresentando: boolean; alternarApresentacao: () => void };
const Ctx = createContext<Estado>({ aberta: true, alternar: () => {}, apresentando: false, alternarApresentacao: () => {} });

export function SidebarProvider({ children }: { children: ReactNode }) {
  // No servidor o menu nasce aberto; no navegador vale o que ficou salvo.
  const aberta = useSyncExternalStore(assinar, lerAberta, () => true);
  const [apresentando, setApresentando] = useState(false);

  // Sair da tela cheia pelo Esc tambem encerra o modo apresentacao.
  useEffect(() => {
    const aoMudar = () => {
      if (!document.fullscreenElement) setApresentando(false);
    };
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  function alternar() {
    try {
      localStorage.setItem(CHAVE, aberta ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  }

  function alternarApresentacao() {
    if (apresentando) {
      setApresentando(false);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } else {
      setApresentando(true);
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }

  return (
    <Ctx.Provider value={{ aberta, alternar, apresentando, alternarApresentacao }}>
      <div className={cn(apresentando && "modo-apresentacao")}>
        {children}
        {apresentando && (
          <button
            type="button"
            onClick={alternarApresentacao}
            title="Sair da apresentação (Esc)"
            className="fixed right-4 top-4 z-50 flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-xs font-medium opacity-40 shadow-sm backdrop-blur transition-opacity hover:opacity-100 print:hidden"
          >
            <Minimize2 size={14} />
            Sair da apresentação
          </button>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useSidebar = () => useContext(Ctx);

export function SidebarToggle() {
  const { aberta, alternar } = useSidebar();
  const Icone = aberta ? PanelLeftClose : PanelLeftOpen;
  return (
    <button
      type="button"
      onClick={alternar}
      title={aberta ? "Ocultar menu" : "Mostrar menu"}
      aria-label={aberta ? "Ocultar menu" : "Mostrar menu"}
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-border/40 md:flex print:hidden"
    >
      <Icone size={16} />
    </button>
  );
}

export function ApresentarButton() {
  const { alternarApresentacao } = useSidebar();
  return (
    <button
      type="button"
      onClick={alternarApresentacao}
      title="Apresentar em tela cheia"
      className="hidden h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-border/40 md:flex print:hidden"
    >
      <Presentation size={16} />
      Apresentar
    </button>
  );
}
