"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { PtaxDia } from "@/lib/hedge-cambial/ptax";

const dataBr = (iso: string) => iso.split("-").reverse().join("/");
const taxa = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;

export function HistoricoDolarView({ historico }: { historico: PtaxDia[] }) {
  const anos = useMemo(() => Array.from(new Set(historico.map((h) => h.data.slice(0, 4)))).sort().reverse(), [historico]);
  const [ano, setAno] = useState(anos[0] ?? "todos");
  const [mes, setMes] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  // Variacao de cada dia contra o dia util anterior (sobre a lista completa).
  const comVariacao = useMemo(
    () =>
      historico.map((h, i) => ({
        ...h,
        variacao: i > 0 ? ((h.venda - historico[i - 1].venda) / historico[i - 1].venda) * 100 : null,
      })),
    [historico]
  );

  const filtrado = useMemo(
    () =>
      comVariacao.filter((h) => {
        if (de || ate) return (!de || h.data >= de) && (!ate || h.data <= ate);
        if (ano !== "todos" && !h.data.startsWith(ano)) return false;
        if (mes !== "todos" && h.data.slice(5, 7) !== mes) return false;
        return true;
      }),
    [comVariacao, ano, mes, de, ate]
  );

  const vendas = filtrado.map((h) => h.venda);
  const ultimo = comVariacao.at(-1);
  const resumo = filtrado.length
    ? {
        media: vendas.reduce((a, b) => a + b, 0) / vendas.length,
        min: Math.min(...vendas),
        max: Math.max(...vendas),
        variacao: ((filtrado.at(-1)!.venda - filtrado[0].venda) / filtrado[0].venda) * 100,
      }
    : null;

  function exportar() {
    const linhas = ["Data;Compra;Venda;Variacao dia (%)"].concat(
      filtrado.map((h) =>
        [dataBr(h.data), taxa(h.compra), taxa(h.venda), h.variacao === null ? "" : h.variacao.toFixed(2).replace(".", ",")].join(";")
      )
    );
    const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ptax-dolar-${filtrado[0]?.data ?? ""}-a-${filtrado.at(-1)?.data ?? ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      {ultimo && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/60 p-4">
            <p className="text-xs font-medium text-muted">Ultima PTAX ({dataBr(ultimo.data)})</p>
            <p className="mt-1.5 text-lg font-semibold">
              Compra {taxa(ultimo.compra)} - Venda {taxa(ultimo.venda)}
            </p>
            {ultimo.variacao !== null && (
              <p className={cn("text-xs", ultimo.variacao > 0 ? "text-danger" : "text-primary")}>{pct(ultimo.variacao)} no dia</p>
            )}
          </Card>
          {resumo && (
            <>
              <Card className="p-4">
                <p className="text-xs font-medium text-muted">Media do periodo (venda)</p>
                <p className="mt-1.5 text-lg font-semibold">{taxa(resumo.media)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-muted">Minima / maxima (venda)</p>
                <p className="mt-1.5 text-lg font-semibold">
                  {taxa(resumo.min)} / {taxa(resumo.max)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-muted">Variacao no periodo</p>
                <p className={cn("mt-1.5 text-lg font-semibold", resumo.variacao > 0 ? "text-danger" : "text-primary")}>
                  {pct(resumo.variacao)}
                </p>
              </Card>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={ano}
          onChange={(e) => {
            setAno(e.target.value);
            setDe("");
            setAte("");
          }}
          className="w-auto"
        >
          <option value="todos">Todos os anos</option>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          value={mes}
          onChange={(e) => {
            setMes(e.target.value);
            setDe("");
            setAte("");
          }}
          className="w-auto"
        >
          <option value="todos">Todos os meses</option>
          {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((m) => (
            <option key={m} value={m}>
              {new Date(2000, Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "long" })}
            </option>
          ))}
        </Select>
        <span className="text-xs text-muted">ou periodo:</span>
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="w-auto" title="De" />
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="w-auto" title="Ate" />
        <div className="ml-auto">
          <Button variant="outline" onClick={exportar} disabled={!filtrado.length}>
            <Download size={15} /> Exportar (Excel/CSV)
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 text-right font-medium">Compra</th>
                <th className="px-4 py-2 text-right font-medium">Venda</th>
                <th className="px-4 py-2 text-right font-medium">Variacao no dia</th>
              </tr>
            </thead>
            <tbody>
              {[...filtrado].reverse().map((h) => (
                <tr key={h.data} className="border-b border-border/60">
                  <td className="px-4 py-1.5">{dataBr(h.data)}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums">{taxa(h.compra)}</td>
                  <td className="px-4 py-1.5 text-right font-medium tabular-nums">{taxa(h.venda)}</td>
                  <td
                    className={cn(
                      "px-4 py-1.5 text-right tabular-nums",
                      h.variacao !== null && h.variacao > 0 && "text-danger",
                      h.variacao !== null && h.variacao < 0 && "text-primary"
                    )}
                  >
                    {h.variacao === null ? "-" : pct(h.variacao)}
                  </td>
                </tr>
              ))}
              {filtrado.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Nenhuma cotacao no periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted">
          {filtrado.length} dia(s) util(eis). Fonte: Banco Central (PTAX de fechamento, publicada por volta das 13h10). O sistema grava
          sozinho a PTAX de cada dia e usa a de venda como dolar do dia na TRAVA NDF e no Dashboard Hedge.
        </p>
      </Card>
    </div>
  );
}
