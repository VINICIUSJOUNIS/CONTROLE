"use client";

import { Fragment, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, FileUp, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CATEGORIAS_FIXAS, NATUREZAS, ROTULO_NATUREZA, type ContaClassificada, type Natureza } from "@/lib/credito/despesas";
import {
  editarValorConta,
  excluirBalanceteDespesas,
  excluirDespesaManual,
  incluirDespesa,
  reclassificarConta,
  restaurarConta,
} from "@/app/(dashboard)/credito/despesas-fixas/actions";

const brl = (v: number | null) =>
  v === null ? "-" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(v);
const pct = (v: number | null) => (v === null || !Number.isFinite(v) ? "-" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`);

// Limite de corpo de requisicao da Vercel e ~4,5 MB.
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

export function EnviarBalancete() {
  const router = useRouter();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function enviar() {
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO) return setErro("O PDF passa de 4 MB.");
    setErro("");
    setEnviando(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      const res = await fetch("/api/credito/despesas", { method: "POST", body: form, signal: controller.signal });
      const ultima = (await res.text()).trim().split("\n").pop() ?? "";
      let r: { competencia?: string; erro?: string } = {};
      try {
        r = JSON.parse(ultima.replace(/^\.+/, ""));
      } catch {
        r = { erro: "Resposta inesperada do servidor." };
      }
      if (!res.ok || r.erro || !r.competencia) return setErro(r.erro ?? "Falha ao processar o balancete.");
      router.push(`/credito/despesas-fixas?mes=${r.competencia}`);
      router.refresh();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setErro("Falha de conexão ao enviar o balancete.");
    } finally {
      setEnviando(false);
      abortRef.current = null;
    }
  }

  return (
    <Card className="print:hidden">
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-xs font-medium text-muted">Balancete do mês em PDF (a IA extrai as contas de despesa)</span>
            <input
              type="file"
              accept="application/pdf"
              disabled={enviando}
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
          </label>
          {enviando ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              <Loader2 size={14} className="animate-spin" />
              Cancelar
            </Button>
          ) : (
            <Button onClick={enviar} disabled={!arquivo}>
              <FileUp size={14} />
              Incluir mês
            </Button>
          )}
        </div>
        {enviando && <p className="text-xs text-muted">A IA está lendo o balancete. Costuma levar de 1 a 3 minutos.</p>}
        {erro && <p className="text-sm text-danger">{erro}</p>}
      </CardContent>
    </Card>
  );
}

export function ExcluirMesDespesas({ id, rotulo }: { id: string; rotulo: string }) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pendente}
      className="print:hidden"
      onClick={() => {
        if (confirm(`Excluir o balancete de ${rotulo}?`))
          iniciar(async () => {
            await excluirBalanceteDespesas(id);
            router.push("/credito/despesas-fixas");
          });
      }}
    >
      <Trash2 size={14} className="text-danger" />
      Excluir mês
    </Button>
  );
}

function SeletorNatureza({ conta }: { conta: ContaClassificada }) {
  const [pendente, iniciar] = useTransition();
  return (
    <select
      disabled={pendente}
      value={conta.origem === "ajuste" ? conta.natureza : ""}
      onChange={(e) => {
        const v = e.target.value as Natureza | "";
        const categoria = v === "fixa" ? (CATEGORIAS_FIXAS.includes(conta.categoria as (typeof CATEGORIAS_FIXAS)[number]) ? conta.categoria : "Despesas gerais") : conta.categoria;
        iniciar(() => reclassificarConta(conta.classificacao, v === "" ? null : v, categoria));
      }}
      title="Reclassificar esta conta em todos os meses"
      className="rounded border border-border bg-background px-1 py-0.5 text-xs print:hidden"
    >
      <option value="">Regra padrão ({ROTULO_NATUREZA[conta.natureza]})</option>
      {NATUREZAS.map((n) => (
        <option key={n} value={n}>
          {ROTULO_NATUREZA[n]}
        </option>
      ))}
    </select>
  );
}

type Categoria = { categoria: string; mes: number; acumulado: number; media: number; contas: ContaClassificada[] };

export function TabelaFixas({
  balanceteId,
  categorias,
  totalMes,
  totalAcumulado,
  meses,
}: {
  balanceteId: string;
  categorias: Categoria[];
  totalMes: number;
  totalAcumulado: number;
  meses: number;
}) {
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const alternar = (c: string) =>
    setAbertas((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  return (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            <th className="py-2 text-left font-medium">Categoria / conta</th>
            <th className="py-2 pl-4 text-right font-medium">Mês</th>
            <th className="py-2 pl-4 text-right font-medium">% do mês</th>
            <th className="py-2 pl-4 text-right font-medium">Média mensal anterior</th>
            <th className="py-2 pl-4 text-right font-medium">Acumulado no ano</th>
            <th className="py-2 pl-4 text-right font-medium">Média mensal do ano</th>
            <th className="py-2 pl-4 text-left font-medium print:hidden">Natureza</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map((c) => {
            const aberta = abertas.has(c.categoria);
            return (
              <Fragment key={c.categoria}>
                <tr onClick={() => alternar(c.categoria)} className="cursor-pointer border-b border-border/50 font-semibold hover:bg-border/20">
                  <td className="py-2">
                    {aberta ? <ChevronDown size={13} className="mr-1 inline" /> : <ChevronRight size={13} className="mr-1 inline" />}
                    {c.categoria} <span className="text-xs font-normal text-muted">({c.contas.length})</span>
                  </td>
                  <td className="py-2 pl-4 text-right tabular-nums">{brl(c.mes)}</td>
                  <td className="py-2 pl-4 text-right tabular-nums">{pct(totalMes ? c.mes / totalMes : null)}</td>
                  <td className="py-2 pl-4 text-right tabular-nums">{meses > 1 ? brl(c.contas.reduce((s, x) => s + (x.mediaAnterior ?? 0), 0)) : "-"}</td>
                  <td className="py-2 pl-4 text-right tabular-nums">{brl(c.acumulado)}</td>
                  <td className="py-2 pl-4 text-right tabular-nums">{brl(c.media)}</td>
                  <td className="print:hidden" />
                </tr>
                {(aberta ? c.contas : []).map((x) => (
                  <LinhaConta key={`${x.classificacao}:${x.valorMes}:${x.saldoAnterior}`} balanceteId={balanceteId} conta={x} totalMes={totalMes} meses={meses} />
                ))}
              </Fragment>
            );
          })}
          <tr className="bg-border/30 font-semibold">
            <td className="py-2">Total das despesas fixas</td>
            <td className="py-2 pl-4 text-right tabular-nums">{brl(totalMes)}</td>
            <td className="py-2 pl-4 text-right tabular-nums">100,0%</td>
            <td className="py-2 pl-4 text-right tabular-nums">
              {meses > 1 ? brl(categorias.reduce((s, c) => s + c.contas.reduce((t, x) => t + (x.mediaAnterior ?? 0), 0), 0)) : "-"}
            </td>
            <td className="py-2 pl-4 text-right tabular-nums">{brl(totalAcumulado)}</td>
            <td className="py-2 pl-4 text-right tabular-nums">{brl(totalAcumulado / meses)}</td>
            <td className="print:hidden" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ContasExcluidas({ contas }: { contas: ContaClassificada[] }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setAberta((a) => !a)} className="flex items-center gap-1 text-sm font-medium text-primary print:hidden">
        {aberta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Contas de despesa que não são fixas ({contas.length}) - conferência do critério
      </button>
      {aberta && (
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-1.5 text-left font-medium">Conta</th>
              <th className="py-1.5 pl-3 text-left font-medium">Motivo</th>
              <th className="py-1.5 pl-3 text-right font-medium">Mês</th>
              <th className="py-1.5 pl-3 text-right font-medium">Acumulado</th>
              <th className="py-1.5 pl-3 text-left font-medium">Natureza</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((x) => (
              <tr key={x.classificacao} className="border-b border-border/30 align-top">
                <td className="py-1 whitespace-normal">
                  <span className="font-mono text-muted">{x.classificacao}</span> {x.descricao}
                </td>
                <td className="py-1 pl-3 whitespace-normal text-muted">
                  {ROTULO_NATUREZA[x.natureza]} - {x.categoria}
                  {x.nota ? `. ${x.nota}` : ""}
                </td>
                <td className="py-1 pl-3 text-right tabular-nums">{brl(x.valorMes)}</td>
                <td className="py-1 pl-3 text-right tabular-nums">{brl(x.saldoAtual)}</td>
                <td className="py-1 pl-3">
                  <SeletorNatureza conta={x} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Valor digitado no padrao brasileiro (1.234,56) ou com ponto decimal.
function lerValor(texto: string): number | null {
  const t = texto.trim().replace(/[R$\s]/g, "");
  if (!t) return 0;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}
const paraTexto = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function LinhaConta({ balanceteId, conta: x, totalMes, meses }: { balanceteId: string; conta: ContaClassificada; totalMes: number; meses: number }) {
  const [editando, setEditando] = useState(false);
  const [mes, setMes] = useState(paraTexto(x.valorMes));
  const [anterior, setAnterior] = useState(paraTexto(x.saldoAnterior));
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function salvar() {
    const v = lerValor(mes);
    const a = lerValor(anterior);
    if (v === null || a === null) return setErro("Valor inválido.");
    setErro("");
    iniciar(async () => {
      await editarValorConta(balanceteId, x.classificacao, v, a);
      setEditando(false);
    });
  }

  const campo = "w-28 rounded border border-border bg-background px-1.5 py-0.5 text-right text-xs tabular-nums";
  return (
    <tr className="border-b border-border/30 align-top text-xs">
      <td className="py-1.5 pl-6 whitespace-normal">
        <span className="font-mono text-muted">{x.manual ? "manual" : x.classificacao}</span> {x.descricao}
        {x.periodica && <span className="ml-1 text-muted">(anual/eventual)</span>}
        {x.manual && <span className="ml-1 rounded bg-primary/10 px-1 text-primary">incluída</span>}
        {x.original && (
          <span className="ml-1 rounded bg-warning/10 px-1 text-warning" title={`Valor do PDF: mês ${brl(x.original.debito - x.original.credito)}, acumulado ${brl(x.original.saldoAtual)}`}>
            editado
          </span>
        )}
        {x.nota && <p className="text-muted">{x.nota}</p>}
        {erro && <p className="text-danger">{erro}</p>}
      </td>
      <td className={cn("py-1.5 pl-4 text-right tabular-nums", x.valorMes === 0 && "text-muted")}>
        {editando ? <input value={mes} onChange={(e) => setMes(e.target.value)} className={campo} aria-label="Valor do mês" autoFocus /> : brl(x.valorMes)}
      </td>
      <td className="py-1.5 pl-4 text-right tabular-nums text-muted">{pct(totalMes ? x.valorMes / totalMes : null)}</td>
      <td className="py-1.5 pl-4 text-right tabular-nums text-muted">
        {editando ? (
          <span className="flex flex-col items-end gap-0.5">
            <input value={anterior} onChange={(e) => setAnterior(e.target.value)} className={campo} aria-label="Acumulado até o mês anterior" />
            <span className="text-[10px]">acumulado até o mês anterior</span>
          </span>
        ) : (
          brl(x.mediaAnterior)
        )}
      </td>
      <td className="py-1.5 pl-4 text-right tabular-nums">{brl(x.saldoAtual)}</td>
      <td className="py-1.5 pl-4 text-right tabular-nums text-muted">{brl(x.saldoAtual / meses)}</td>
      <td className="py-1.5 pl-4 print:hidden">
        <div className="flex items-center gap-1">
          {editando ? (
            <>
              <button type="button" onClick={salvar} disabled={pendente} title="Salvar" className="rounded p-1 text-success hover:bg-border/40">
                {pendente ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setMes(paraTexto(x.valorMes));
                  setAnterior(paraTexto(x.saldoAnterior));
                  setErro("");
                }}
                title="Cancelar"
                className="rounded p-1 hover:bg-border/40"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditando(true)} title="Editar valores" className="rounded p-1 hover:bg-border/40">
                <Pencil size={13} />
              </button>
              {x.original && (
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => iniciar(() => restaurarConta(balanceteId, x.classificacao))}
                  title="Restaurar o valor do PDF"
                  className="rounded p-1 hover:bg-border/40"
                >
                  <RotateCcw size={13} />
                </button>
              )}
              {x.manual ? (
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => {
                    if (confirm(`Excluir a despesa ${x.descricao}?`)) iniciar(() => excluirDespesaManual(balanceteId, x.classificacao));
                  }}
                  title="Excluir despesa incluída"
                  className="rounded p-1 text-danger hover:bg-border/40"
                >
                  <Trash2 size={13} />
                </button>
              ) : (
                <SeletorNatureza conta={x} />
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function IncluirDespesa({ balanceteId }: { balanceteId: string }) {
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_FIXAS[0]);
  const [mes, setMes] = useState("");
  const [anterior, setAnterior] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function salvar() {
    const v = lerValor(mes);
    const a = lerValor(anterior);
    if (!descricao.trim()) return setErro("Informe a descrição.");
    if (v === null || a === null) return setErro("Valor inválido.");
    setErro("");
    iniciar(async () => {
      await incluirDespesa(balanceteId, { descricao, categoria, natureza: "fixa", valorMes: v, saldoAnterior: a });
      setDescricao("");
      setMes("");
      setAnterior("");
      setAberto(false);
    });
  }

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" className="mb-3 print:hidden" onClick={() => setAberto(true)}>
        <Plus size={14} />
        Incluir despesa
      </Button>
    );
  }
  const campo = "rounded-lg border border-border bg-background px-2 py-1.5 text-sm";
  return (
    <div className="mb-4 space-y-2 rounded-lg border border-border p-3 print:hidden">
      <p className="text-sm font-medium">Incluir despesa fixa neste mês</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[220px] flex-1 text-xs text-muted">
          Descrição
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className={cn(campo, "mt-1 block w-full")} placeholder="Ex.: Energia elétrica (provisão de julho)" />
        </label>
        <label className="text-xs text-muted">
          Categoria
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={cn(campo, "mt-1 block")}>
            {CATEGORIAS_FIXAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Valor do mês (R$)
          <input value={mes} onChange={(e) => setMes(e.target.value)} className={cn(campo, "mt-1 block w-36 text-right")} placeholder="0,00" />
        </label>
        <label className="text-xs text-muted">
          Acumulado até o mês anterior (R$)
          <input value={anterior} onChange={(e) => setAnterior(e.target.value)} className={cn(campo, "mt-1 block w-36 text-right")} placeholder="0,00" />
        </label>
        <Button size="sm" onClick={salvar} disabled={pendente}>
          {pendente ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Salvar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
    </div>
  );
}
