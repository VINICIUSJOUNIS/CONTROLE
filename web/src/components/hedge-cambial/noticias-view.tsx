"use client";

import { useEffect, useState, useTransition } from "react";
import { DollarSign, ExternalLink, Loader2, Radio, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Noticia, StatusFonte } from "@/lib/hedge-cambial/noticias";
import { cn } from "@/lib/utils";
import { atualizarNoticias, gerarBoletim } from "@/app/(dashboard)/hedge-cambial/noticias/actions";
import { useLeitorVoz } from "@/components/hedge-cambial/leitor-voz";
import { BarraAtualizacao } from "@/components/hedge-cambial/atualizacao-automatica";
import { CambioBcbView } from "@/components/hedge-cambial/cambio-bcb-view";
import type { PainelCambio } from "@/lib/hedge-cambial/cambio-bcb";

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
  cambio,
}: {
  dolar: Noticia[];
  fontes: StatusFonte[];
  buscadoEm: string;
  cambio: PainelCambio;
}) {
  const [agora, setAgora] = useState(() => new Date(buscadoEm).getTime());
  const leitor = useLeitorVoz();
  const [gerando, startGerar] = useTransition();
  const [boletim, setBoletim] = useState<{ texto: string; ia: boolean; aviso?: string } | null>(null);

  // Boletim falado: a IA escreve o texto com as noticias e o painel do BCB, e o
  // navegador le em voz alta.
  function ouvirBoletim() {
    if (leitor.ativo === "boletim") {
      leitor.parar();
      return;
    }
    leitor.parar();
    startGerar(async () => {
      const b = await gerarBoletim();
      setBoletim(b);
      leitor.falar("boletim", b.texto);
    });
  }

  function ouvirNoticia(n: Noticia) {
    if (leitor.ativo === n.link) {
      leitor.parar();
      return;
    }
    leitor.falar(n.link, `${n.titulo}. ${n.resumo} Fonte: ${n.fonte}.`);
  }

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
        rotulo="as ultimas noticias e os dados do Banco Central"
      />

      {leitor.suportado ? (
        <Card className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={ouvirBoletim} disabled={gerando}>
              {gerando ? (
                <Loader2 size={15} className="animate-spin" />
              ) : leitor.ativo === "boletim" ? (
                <Square size={15} />
              ) : (
                <Radio size={15} />
              )}
              {gerando ? "A IA esta preparando o boletim..." : leitor.ativo === "boletim" ? "Parar boletim" : "Ouvir boletim do dolar (IA)"}
            </Button>
            <span className="text-xs text-muted">
              A IA resume em audio as noticias e os dados do Banco Central desta tela. Em cada noticia, o botao Ouvir le a manchete e o resumo.
            </span>
          </div>
          {boletim?.aviso && <p className="text-xs text-warning">{boletim.aviso}</p>}
          {boletim && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer">Texto do boletim {boletim.ia ? "(escrito pela IA)" : ""}</summary>
              <p className="mt-2 whitespace-pre-line leading-relaxed">{boletim.texto}</p>
            </details>
          )}
        </Card>
      ) : (
        <p className="text-xs text-muted">Este navegador nao tem leitura em voz alta. Use o Chrome ou o Edge para ouvir as noticias.</p>
      )}

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
                  {leitor.suportado && (
                    <button
                      type="button"
                      onClick={() => ouvirNoticia(n)}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {leitor.ativo === n.link ? <Square size={11} /> : <Volume2 size={12} />}
                      {leitor.ativo === n.link ? "Parar" : "Ouvir"}
                    </button>
                  )}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <FontesStatus fontes={fontes} />

      <h2 className="pt-2 text-base font-semibold">Cambio - dados oficiais do Banco Central</h2>
      <CambioBcbView painel={cambio} />
    </div>
  );
}
