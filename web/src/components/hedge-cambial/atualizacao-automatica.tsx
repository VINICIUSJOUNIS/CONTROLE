"use client";

import { useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const hora = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

// Barra de atualizacao das telas com dados externos (noticias, cambio BCB):
// busca de novo sozinha quando completa o intervalo desde a ultima busca (e ao
// voltar para a aba, se o navegador atrasou o timer) e tem o botao
// "Atualizar agora". `descartarCache` e a server action que expira o cache.
export function BarraAtualizacao({
  buscadoEm,
  intervaloMs,
  descartarCache,
  rotulo,
}: {
  buscadoEm: string;
  intervaloMs: number;
  descartarCache: () => Promise<void>;
  rotulo: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ultima = new Date(buscadoEm).getTime();
  const proxima = ultima + intervaloMs;

  const atualizar = useCallback(() => {
    startTransition(async () => {
      await descartarCache();
      router.refresh();
    });
  }, [router, descartarCache]);

  useEffect(() => {
    const id = setTimeout(atualizar, Math.max(5000, proxima - Date.now()));
    const aoVoltar = () => {
      if (document.visibilityState === "visible" && Date.now() >= proxima) atualizar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [proxima, atualizar]);

  const minutos = Math.round(intervaloMs / 60000);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span>
        {pending
          ? `Buscando ${rotulo}...`
          : `Buscado as ${hora(ultima)}. Proxima atualizacao automatica as ${hora(proxima)} (a cada ${minutos} minutos).`}
      </span>
      <Button variant="outline" size="sm" disabled={pending} onClick={atualizar}>
        <RefreshCw size={13} className={pending ? "animate-spin" : undefined} /> Atualizar agora
      </Button>
    </div>
  );
}
