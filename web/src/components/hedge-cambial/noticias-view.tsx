"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coffee, DollarSign, ExternalLink, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Noticia } from "@/lib/hedge-cambial/noticias";
import { cn } from "@/lib/utils";

const INTERVALO_MS = 30 * 60 * 1000;

function quando(iso: string | null, agora: number) {
  if (!iso) return "";
  const min = Math.round((agora - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `ha ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `ha ${h} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Lista({
  titulo,
  icone,
  noticias,
  agora,
  cabecalho,
}: {
  titulo: string;
  icone: React.ReactNode;
  noticias: Noticia[];
  agora: number;
  cabecalho?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
        {icone}
        {titulo}
      </div>
      {cabecalho}
      {noticias.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">Nao foi possivel carregar as noticias agora.</p>
      ) : (
        <ol>
          {noticias.map((n) => (
            <li key={n.link} className="border-b border-border/60 px-4 py-3 last:border-0">
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-1.5 text-sm font-medium hover:text-primary"
              >
                {n.tendencia && (
                  <span
                    className={cn(
                      "mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                      n.tendencia === "ALTA" ? "bg-primary/15 text-primary" : "bg-danger/15 text-danger"
                    )}
                  >
                    {n.tendencia === "ALTA" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {n.tendencia}
                  </span>
                )}
                <span className="group-hover:underline">{n.titulo}</span>
                <ExternalLink size={12} className="mt-1 shrink-0 text-muted" />
              </a>
              {n.resumo && <p className="mt-1 text-xs text-muted">{n.resumo}</p>}
              <p className="mt-1 text-[11px] text-muted">
                {n.fonte}
                {n.data && ` - ${quando(n.data, agora)}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function ResumoTendencia({ noticias }: { noticias: Noticia[] }) {
  const altas = noticias.filter((n) => n.tendencia === "ALTA").length;
  const quedas = noticias.filter((n) => n.tendencia === "QUEDA").length;
  if (altas + quedas === 0) return null;
  const direcao = altas > quedas ? "ALTA" : quedas > altas ? "QUEDA" : "LATERAL";
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-border/20 px-4 py-2.5 text-xs">
      <span>
        Tendencia nas noticias:{" "}
        <strong className={cn(direcao === "ALTA" && "text-primary", direcao === "QUEDA" && "text-danger")}>{direcao}</strong>
      </span>
      <span className="text-muted">
        {altas} de alta - {quedas} de queda (ultimas {altas + quedas})
      </span>
      <span className="text-muted">Leitura das manchetes, nao e recomendacao de operacao.</span>
    </div>
  );
}

export function NoticiasView({
  dolar,
  cafe,
  tendencia,
  buscadoEm,
}: {
  dolar: Noticia[];
  cafe: Noticia[];
  tendencia: Noticia[];
  buscadoEm: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [agora, setAgora] = useState(() => new Date(buscadoEm).getTime());

  // Busca de novo a cada 30 minutos enquanto a tela estiver aberta.
  useEffect(() => {
    const id = setInterval(() => startTransition(() => router.refresh()), INTERVALO_MS);
    return () => clearInterval(id);
  }, [router]);

  // Atualiza o "ha X min" a cada minuto.
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const hora = new Date(buscadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Atualizado as {hora}. Proxima atualizacao automatica em ate 30 minutos.</span>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
          <RefreshCw size={13} className={pending ? "animate-spin" : undefined} /> Atualizar
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Lista titulo="Mercado de Dolar" icone={<DollarSign size={16} className="text-primary" />} noticias={dolar} agora={agora} />
        <Lista titulo="Mercado de Cafe" icone={<Coffee size={16} className="text-primary" />} noticias={cafe} agora={agora} />
      </div>
      <Lista
        titulo="Tendencia Bolsa NY - Cafe (alta ou queda no preco)"
        icone={<TrendingUp size={16} className="text-primary" />}
        noticias={tendencia}
        agora={agora}
        cabecalho={<ResumoTendencia noticias={tendencia} />}
      />
    </div>
  );
}
