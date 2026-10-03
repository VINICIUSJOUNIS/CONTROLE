"use client";

import { useEffect, useState } from "react";
import { DollarSign, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Noticia, StatusFonte } from "@/lib/hedge-cambial/noticias";
import { cn } from "@/lib/utils";
import { atualizarNoticias } from "@/app/(dashboard)/hedge-cambial/noticias/actions";
import { BarraAtualizacao } from "@/components/hedge-cambial/atualizacao-automatica";

const INTERVALO_MS = 5 * 60 * 1000;

function quando(iso: string | null, agora: number) {
  if (!iso) return "";
  const min = Math.round((agora - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `ha ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `ha ${h} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Estado de cada fonte na ultima busca: mostra de onde as noticias vieram e
// qual portal nao respondeu (quando a lista vem vazia ou incompleta).
function FontesStatus({ fontes }: { fontes: StatusFonte[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
      <span>Fontes nesta busca:</span>
      {fontes.map((f) => (
        <span
          key={f.url}
          title={f.erro ? `Falha: ${f.erro}` : undefined}
          className={cn(
            "rounded-full border px-2 py-0.5",
            f.ok ? "border-primary/40 text-primary" : "border-danger/50 text-danger"
          )}
        >
          {f.fonte}: {f.ok ? "ok" : "fora do ar"}
        </span>
      ))}
    </div>
  );
}

export function NoticiasView({
  dolar,
  fontes,
  buscadoEm,
}: {
  dolar: Noticia[];
  fontes: StatusFonte[];
  buscadoEm: string;
}) {
  const [agora, setAgora] = useState(() => new Date(buscadoEm).getTime());

  // Atualiza o "ha X min" a cada minuto.
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <BarraAtualizacao
        buscadoEm={buscadoEm}
        intervaloMs={INTERVALO_MS}
        descartarCache={atualizarNoticias}
        rotulo="as ultimas noticias"
      />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
          <DollarSign size={16} className="text-primary" />
          Mercado de Dolar - 10 ultimas noticias
        </div>
        {dolar.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">
            Nenhuma noticia recebida das fontes nesta busca. Veja o estado das fontes abaixo e clique em Atualizar agora.
          </p>
        ) : (
          <ol>
            {dolar.map((n) => (
              <li key={n.link} className="border-b border-border/60 px-4 py-3 last:border-0">
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-1.5 text-sm font-medium hover:text-primary"
                >
                  <span className="group-hover:underline">{n.titulo}</span>
                  <ExternalLink size={12} className="mt-1 shrink-0 text-muted" />
                </a>
                {n.resumo && <p className="mt-1 text-xs text-muted">{n.resumo}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  <span>
                    {n.fonte}
                    {n.data && ` - ${quando(n.data, agora)}`}
                  </span>
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                    Ler noticia completa
                  </a>
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <FontesStatus fontes={fontes} />
    </div>
  );
}
