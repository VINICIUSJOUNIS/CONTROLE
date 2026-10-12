"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

// Menu lateral aberto/fechado, compartilhado entre a Sidebar e o botao da
// Topbar e lembrado neste navegador (vale para todos os modulos).
const CHAVE = "controle:menu-lateral-aberto";

const Ctx = createContext<{ aberta: boolean; alternar: () => void }>({ aberta: true, alternar: () => {} });

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE) === "0") setAberta(false);
    } catch {}
  }, []);

  function alternar() {
    setAberta((a) => {
      try {
        localStorage.setItem(CHAVE, a ? "0" : "1");
      } catch {}
      return !a;
    });
  }

  return <Ctx.Provider value={{ aberta, alternar }}>{children}</Ctx.Provider>;
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
