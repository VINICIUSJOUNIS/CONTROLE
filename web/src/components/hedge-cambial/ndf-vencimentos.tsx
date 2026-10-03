"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Ctx, ndfAberta, ndfAjustePrevisto, Registro, travaSaldo, txt } from "@/lib/hedge-cambial/config";
import { formatarValor } from "@/lib/hedge-cambial/formatar";
import { buscarPtax, salvarDolarDoDia } from "@/app/(dashboard)/hedge-cambial/actions";

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

function diasAte(de: string, ate: string) {
  const a = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const b = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

// Dolar do dia usado no calculo do a receber / a pagar (mesmo parametro do
// Dashboard Hedge): digitado ou buscado na PTAX do Banco Central.
function DolarDoDia({ dolar, dolarData }: { dolar: number | null; dolarData: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [valor, setValor] = useState(dolar === null ? "" : String(dolar).replace(".", ","));
  const [data, setData] = useState(dolarData ?? "");
  const [msg, setMsg] = useState<{ erro: boolean; texto: string } | null>(null);

  function ptax() {
    setMsg(null);
    startTransition(async () => {
      const r = await buscarPtax();
      if (!r.ok) return setMsg({ erro: true, texto: r.erro });
      setValor(String(r.dolar).replace(".", ","));
      setData(r.data);
      setMsg({ erro: false, texto: `PTAX de ${dataBr(r.data)} carregada. Clique em Salvar.` });
    });
  }

  function salvar() {
    const t = valor.trim();
    const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
    if (!Number.isFinite(n) || n <= 0) return setMsg({ erro: true, texto: "Informe o dolar (ex.: 5,2238)." });
    startTransition(async () => {
      const r = await salvarDolarDoDia(n, data || null);
      if (!r.ok) return setMsg({ erro: true, texto: r.erro });
      setMsg({ erro: false, texto: "Dolar salvo. A receber e a pagar recalculados." });
      router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Dolar do dia (R$/US$)</Label>
          <Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label>Data do dolar</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-40" />
        </div>
        <Button variant="outline" onClick={ptax} disabled={pending} title="Buscar a PTAX de venda no Banco Central">
          <RefreshCw size={14} /> PTAX
        </Button>
        <Button onClick={salvar} disabled={pending}>
          Salvar
        </Button>
        <p className="text-xs text-muted">
          Preencha todo dia: o a receber / a pagar de cada NDF em aberto e calculado por este dolar.
          {dolarData && ` Dolar atual: ${dolar?.toLocaleString("pt-BR", { minimumFractionDigits: 4 })} de ${dataBr(dolarData)}.`}
        </p>
      </div>
      {msg && <p className={cn("mt-2 text-sm", msg.erro ? "text-danger" : "text-primary")}>{msg.texto}</p>}
      {dolar === null && <p className="mt-2 text-sm text-warning">Sem dolar do dia: o a receber e o a pagar ficam em branco.</p>}
    </Card>
  );
}

type Grupo = {
  vencimento: string;
  qtd: number;
  compras: number;
  vendas: number;
  aReceber: number;
  aPagar: number;
};

export function NdfVencimentos({
  registros,
  ctx,
  dolarData,
}: {
  registros: Registro[];
  ctx: Ctx;
  dolarData: string | null;
}) {
  const grupos = new Map<string, Grupo>();
  for (const r of registros) {
    const d = r.dados;
    if (!ndfAberta(d)) continue;
    const venc = txt(d, "vencimento") || "sem data";
    const g = grupos.get(venc) ?? { vencimento: venc, qtd: 0, compras: 0, vendas: 0, aReceber: 0, aPagar: 0 };
    const saldo = travaSaldo(d);
    g.qtd++;
    if (saldo > 0) g.compras += saldo;
    else g.vendas += saldo;
    const a = ndfAjustePrevisto(d, ctx) ?? 0;
    if (a > 0) g.aReceber += a;
    else g.aPagar += -a;
    grupos.set(venc, g);
  }
  const lista = Array.from(grupos.values()).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const total = lista.reduce(
    (t, g) => ({ qtd: t.qtd + g.qtd, compras: t.compras + g.compras, vendas: t.vendas + g.vendas, aReceber: t.aReceber + g.aReceber, aPagar: t.aPagar + g.aPagar }),
    { qtd: 0, compras: 0, vendas: 0, aReceber: 0, aPagar: 0 }
  );
  const semDolar = !ctx.dolar;
  const brl = (v: number) => (semDolar ? "-" : formatarValor(v, "brl"));

  return (
    <div className="space-y-4">
      <DolarDoDia dolar={ctx.dolar} dolarData={dolarData} />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
          <CalendarClock size={16} className="text-primary" />
          NDFs em aberto por vencimento - a receber e a pagar pelo dolar do dia
        </div>
        {lista.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">Nenhuma NDF em aberto.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 text-right font-medium">NDFs</th>
                  <th className="px-4 py-2 text-right font-medium">Compradas (US$)</th>
                  <th className="px-4 py-2 text-right font-medium">Vendidas (US$)</th>
                  <th className="px-4 py-2 text-right font-medium">A receber (R$)</th>
                  <th className="px-4 py-2 text-right font-medium">A pagar (R$)</th>
                  <th className="px-4 py-2 text-right font-medium">Liquido (R$)</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => {
                  const dias = g.vencimento === "sem data" ? null : diasAte(ctx.hoje, g.vencimento);
                  const liquido = g.aReceber - g.aPagar;
                  return (
                    <tr
                      key={g.vencimento}
                      className={cn("border-b border-border/60", dias !== null && dias < 0 && "bg-danger/10", dias !== null && dias >= 0 && dias <= 7 && "bg-warning/10")}
                    >
                      <td className="whitespace-nowrap px-4 py-2">
                        {g.vencimento === "sem data" ? "Sem data" : dataBr(g.vencimento)}
                        {dias !== null && (
                          <span className={cn("ml-2 text-[11px]", dias < 0 ? "text-danger" : "text-muted")}>
                            {dias < 0 ? `vencido ha ${-dias} dia(s)` : dias === 0 ? "vence hoje" : `em ${dias} dia(s)`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{g.qtd}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatarValor(g.compras, "usd")}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatarValor(g.vendas, "usd")}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-primary">{brl(g.aReceber)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-danger">{brl(g.aPagar)}</td>
                      <td className={cn("px-4 py-2 text-right font-semibold tabular-nums", liquido < 0 ? "text-danger" : "text-primary")}>
                        {brl(liquido)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold">
                  <td className="px-4 py-2">TOTAL</td>
                  <td className="px-4 py-2 text-right tabular-nums">{total.qtd}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatarValor(total.compras, "usd")}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatarValor(total.vendas, "usd")}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-primary">{brl(total.aReceber)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-danger">{brl(total.aPagar)}</td>
                  <td
                    className={cn("px-4 py-2 text-right tabular-nums", total.aReceber - total.aPagar < 0 ? "text-danger" : "text-primary")}
                  >
                    {brl(total.aReceber - total.aPagar)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted">
          Previsao: saldo de cada NDF x (dolar do dia - taxa contratada). Compra ganha se o dolar subir; venda ganha se o dolar
          cair. Na liquidacao, o banco usa a PTAX de venda do dia util anterior ao vencimento, entao o valor final muda com o
          dolar ate la.
        </p>
      </Card>
    </div>
  );
}
