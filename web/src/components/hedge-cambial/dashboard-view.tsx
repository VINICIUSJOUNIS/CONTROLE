"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { Dashboard, LinhaDashboard } from "@/lib/hedge-cambial/dashboard";
import type { Parametros } from "@/lib/hedge-cambial/data";
import type { Formato } from "@/lib/hedge-cambial/config";
import { formatarValor } from "@/lib/hedge-cambial/formatar";
import { buscarPtax, salvarParametros } from "@/app/(dashboard)/hedge-cambial/actions";

function lerNumero(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : NaN;
}

const paraTexto = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));

function Tabela({
  titulo,
  linhas,
  net,
  formato,
}: {
  titulo: string;
  linhas: LinhaDashboard[];
  net?: number;
  formato: Formato;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold">{titulo}</div>
      <table className="w-full text-sm">
        <tbody>
          {linhas.map((l) => (
            <tr key={l.label} className={cn("border-b border-border/60", l.foraDoNet && "text-muted italic")}>
              <td className="px-4 py-2">
                {l.aba ? (
                  <Link href={`/hedge-cambial/${l.aba}`} className="hover:text-primary hover:underline">
                    {l.label}
                  </Link>
                ) : (
                  l.label
                )}
                {l.ajuda && <p className="text-[11px] text-muted">{l.ajuda}</p>}
              </td>
              <td
                className={cn(
                  "whitespace-nowrap px-4 py-2 text-right tabular-nums",
                  (l.valor ?? 0) < 0 && "text-danger"
                )}
              >
                {l.valor === null ? "-" : formatarValor(l.valor, formato)}
              </td>
            </tr>
          ))}
          {net !== undefined && (
            <tr className="bg-border/20 font-semibold">
              <td className="px-4 py-2.5">NET</td>
              <td className={cn("whitespace-nowrap px-4 py-2.5 text-right tabular-nums", net < 0 && "text-danger")}>
                {formatarValor(net, formato)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

export function HedgeDashboardView({ dashboard, parametros }: { dashboard: Dashboard; parametros: Parametros }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dolar, setDolar] = useState(paraTexto(parametros.dolar));
  const [dolarData, setDolarData] = useState(parametros.dolarData ?? "");
  const [ny, setNy] = useState(paraTexto(parametros.ny));
  const [b3, setB3] = useState(paraTexto(parametros.posicaoB3));
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function atualizarPtax() {
    setMsg(null);
    startTransition(async () => {
      const r = await buscarPtax();
      if (!r.ok) {
        setMsg({ tipo: "erro", texto: r.erro });
        return;
      }
      setDolar(String(r.dolar).replace(".", ","));
      setDolarData(r.data);
      setMsg({ tipo: "ok", texto: `PTAX de ${r.data.split("-").reverse().join("/")} carregada. Clique em Salvar.` });
    });
  }

  function salvar() {
    const d = lerNumero(dolar);
    const n = lerNumero(ny);
    const p = lerNumero(b3);
    if ([d, n, p].some((v) => Number.isNaN(v))) {
      setMsg({ tipo: "erro", texto: "Numero invalido." });
      return;
    }
    startTransition(async () => {
      const r = await salvarParametros({ dolar: d, dolarData: dolarData || null, ny: n, posicaoB3: p });
      if (!r.ok) {
        setMsg({ tipo: "erro", texto: r.erro });
        return;
      }
      setMsg({ tipo: "ok", texto: "Parametros salvos." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">Parametros de mercado (preencher diariamente)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Dolar do dia (R$/US$)</Label>
            <Input inputMode="decimal" value={dolar} onChange={(e) => setDolar(e.target.value)} />
          </div>
          <div>
            <Label>Data do dolar</Label>
            <Input type="date" value={dolarData} onChange={(e) => setDolarData(e.target.value)} />
          </div>
          <div>
            <Label>NY atual (c/lb)</Label>
            <Input inputMode="decimal" value={ny} onChange={(e) => setNy(e.target.value)} />
          </div>
          <div>
            <Label>Posicao B3 (US$)</Label>
            <Input inputMode="decimal" value={b3} onChange={(e) => setB3(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={atualizarPtax} disabled={pending} title="Buscar a PTAX de venda no Banco Central">
              <RefreshCw size={14} /> PTAX
            </Button>
            <Button onClick={salvar} disabled={pending}>
              Salvar
            </Button>
          </div>
        </div>
        {msg && <p className={cn("mt-2 text-sm", msg.tipo === "erro" ? "text-danger" : "text-primary")}>{msg.texto}</p>}
        {parametros.dolar === null && (
          <p className="mt-2 text-sm text-warning">
            Sem dolar do dia: valores em R$, MTM e precos medios em R$ ficam em branco.
          </p>
        )}
        {parametros.ny === null && (
          <p className="mt-1 text-sm text-warning">
            Sem NY atual: a PRE-FIXACAO usa o preco medio de venda ME (criterio antigo da planilha).
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Tabela titulo="NAYME - posicao em sacas" linhas={dashboard.sacas} net={dashboard.netSacas} formato="sacas" />
        <Tabela titulo="LONG X SHORT DOLAR (US$)" linhas={dashboard.dolar} net={dashboard.netDolar} formato="usd" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Tabela titulo="Precos medios" linhas={dashboard.precos} formato="num2" />
      </div>
    </div>
  );
}
