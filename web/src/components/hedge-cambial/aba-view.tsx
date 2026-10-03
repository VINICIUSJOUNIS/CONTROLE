"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Campo, Ctx, Dados, Formato, getAbaConfig, Registro } from "@/lib/hedge-cambial/config";
import { formatarValor } from "@/lib/hedge-cambial/formatar";
import { excluirRegistro, salvarRegistro } from "@/app/(dashboard)/hedge-cambial/actions";

const POR_PAGINA = 100;

type Linha = { reg: Registro; calc: Record<string, number | null>; alerta: string | null; busca: string };

type Form = Record<string, string>;

function paraForm(campos: Campo[], dados: Dados): Form {
  const f: Form = {};
  for (const c of campos) {
    const v = dados[c.key];
    if (v === null || v === undefined) f[c.key] = "";
    else if (c.tipo === "numero" && typeof v === "number") f[c.key] = String(v).replace(".", ",");
    else f[c.key] = String(v);
  }
  return f;
}

// Numero digitado no padrao brasileiro: virgula decimal e ponto de milhar
// ("1.234,56"). Sem virgula, o ponto e decimal ("5.2245") - exceto em
// quantidades/valores grandes escritos com milhar ("1.500" sacas = 1500).
const FORMATOS_MILHAR = new Set<Formato | undefined>(["sacas", "brl", "usd"]);
function lerNumero(s: string, formato?: Formato): number | null {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return null;
  let normal = t;
  if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");
  else if (FORMATOS_MILHAR.has(formato) && /^-?\d{1,3}(\.\d{3})+$/.test(t)) normal = t.replace(/\./g, "");
  const n = Number(normal);
  return Number.isFinite(n) ? n : NaN;
}

export function HedgeAbaView({ slug, registros, ctx }: { slug: string; registros: Registro[]; ctx: Ctx }) {
  const config = getAbaConfig(slug)!;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [ano, setAno] = useState("todos");
  const [soAlertas, setSoAlertas] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({});
  const [erro, setErro] = useState<string | null>(null);

  const campoPorKey = useMemo(() => new Map(config.campos.map((c) => [c.key, c])), [config]);
  const calcPorKey = useMemo(() => new Map(config.calculados.map((c) => [c.key, c])), [config]);
  const temData = campoPorKey.has("data");

  const linhas: Linha[] = useMemo(() => {
    const ls = registros.map((reg) => {
      const calc: Record<string, number | null> = {};
      for (const c of config.calculados) calc[c.key] = c.calc(reg.dados, ctx);
      const busca = config.campos
        .filter((c) => c.tipo === "texto" || c.tipo === "opcao")
        .map((c) => String(reg.dados[c.key] ?? ""))
        .join(" ")
        .toLowerCase();
      return { reg, calc, alerta: config.alerta?.(reg.dados, ctx) ?? null, busca };
    });
    // Mais recentes primeiro (data e, no empate, ordem de lancamento).
    return ls.sort((a, b) => {
      const da = String(a.reg.dados.data ?? "");
      const db = String(b.reg.dados.data ?? "");
      if (da !== db) return db.localeCompare(da);
      return b.reg.ordem - a.reg.ordem;
    });
  }, [registros, config, ctx]);

  const opcoesStatus = useMemo(() => {
    if (!config.filtroStatus) return [];
    return Array.from(new Set(registros.map((r) => String(r.dados[config.filtroStatus!] ?? "")).filter(Boolean))).sort();
  }, [registros, config]);

  const anos = useMemo(
    () =>
      Array.from(new Set(registros.map((r) => String(r.dados.data ?? "").slice(0, 4)).filter(Boolean)))
        .sort()
        .reverse(),
    [registros]
  );

  const sugestoes = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const c of config.campos) {
      if (!c.sugestoes && !c.sugestoesFixas) continue;
      const set = new Set<string>(c.sugestoesFixas ?? []);
      if (c.sugestoes) for (const r of registros) if (r.dados[c.key]) set.add(String(r.dados[c.key]));
      m[c.key] = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
    return m;
  }, [registros, config]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (config.filtroStatus && status !== "todos" && String(l.reg.dados[config.filtroStatus] ?? "") !== status) return false;
      if (ano !== "todos" && !String(l.reg.dados.data ?? "").startsWith(ano)) return false;
      if (soAlertas && !l.alerta) return false;
      if (q && !l.busca.includes(q)) return false;
      return true;
    });
  }, [linhas, busca, status, ano, soAlertas, config]);

  const totalAlertas = useMemo(() => linhas.filter((l) => l.alerta).length, [linhas]);
  const indicadores = useMemo(
    () => config.indicadores?.(filtradas.map((l) => l.reg.dados), ctx) ?? [],
    [config, filtradas, ctx]
  );

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, paginas - 1);
  const visiveis = filtradas.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA);

  function valorColuna(l: Linha, key: string) {
    return calcPorKey.has(key) ? l.calc[key] : l.reg.dados[key];
  }

  function formatoColuna(key: string): Formato | undefined {
    const c = campoPorKey.get(key);
    if (c) return c.tipo === "data" ? "data" : c.formato;
    return calcPorKey.get(key)?.formato;
  }

  const totais = useMemo(() => {
    const t: Record<string, number> = {};
    for (const key of config.totais ?? []) {
      t[key] = filtradas.reduce((s, l) => {
        const v = valorColuna(l, key);
        return s + (typeof v === "number" ? v : 0);
      }, 0);
    }
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtradas, config]);

  // Previa das colunas calculadas no formulario, com os valores digitados.
  const previa = useMemo(() => {
    const d: Dados = {};
    for (const c of config.campos) {
      const v = form[c.key] ?? "";
      if (c.tipo === "numero") {
        const n = lerNumero(v, c.formato);
        d[c.key] = n === null || Number.isNaN(n) ? null : n;
      } else d[c.key] = v.trim() || null;
    }
    return {
      calc: config.calculados.map((c) => ({ c, v: c.calc(d, ctx) })),
      alerta: config.alerta?.(d, ctx) ?? null,
    };
  }, [form, config, ctx]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(paraForm(config.campos, config.padrao?.(ctx) ?? {}));
    setErro(null);
    setAberto(true);
  }

  function abrirEdicao(reg: Registro) {
    setEditandoId(reg.id);
    setForm(paraForm(config.campos, reg.dados));
    setErro(null);
    setAberto(true);
  }

  function salvar() {
    const entrada: Record<string, unknown> = {};
    for (const c of config.campos) {
      const v = form[c.key] ?? "";
      if (c.tipo === "numero") {
        const n = lerNumero(v, c.formato);
        if (Number.isNaN(n)) {
          setErro(`${c.label}: numero invalido.`);
          return;
        }
        entrada[c.key] = n;
      } else entrada[c.key] = v.trim() || null;
    }
    setErro(null);
    startTransition(async () => {
      const r = await salvarRegistro(slug, editandoId, entrada);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      router.refresh();
    });
  }

  function excluir(reg: Registro) {
    if (!window.confirm("Excluir este lancamento? Esta acao nao pode ser desfeita.")) return;
    startTransition(async () => {
      const r = await excluirRegistro(slug, reg.id);
      if (!r.ok) window.alert(r.erro);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {indicadores.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {indicadores.map((i) => (
            <Card key={i.label} className={cn("p-4", i.destaque && "border-primary/60")}>
              <p className="text-xs font-medium text-muted">{i.label}</p>
              <p className="mt-1.5 text-lg font-semibold">
                {i.texto ?? (i.valor === null ? "-" : formatarValor(i.valor, i.formato))}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPagina(0);
          }}
          className="w-56"
        />
        {config.filtroStatus && (
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagina(0);
            }}
            className="w-auto"
          >
            <option value="todos">Todos ({campoPorKey.get(config.filtroStatus)?.label})</option>
            {opcoesStatus.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        )}
        {temData && (
          <Select
            value={ano}
            onChange={(e) => {
              setAno(e.target.value);
              setPagina(0);
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
        )}
        {totalAlertas > 0 && (
          <label className="flex items-center gap-2 text-sm text-warning">
            <input type="checkbox" checked={soAlertas} onChange={(e) => setSoAlertas(e.target.checked)} />
            <AlertTriangle size={14} /> Somente com alerta ({totalAlertas})
          </label>
        )}
        <div className="ml-auto">
          <Button onClick={abrirNovo}>
            <Plus size={16} /> Novo lancamento
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-muted">
                <th className="w-6 px-2 py-2" />
                {config.colunas.map((key) => (
                  <th
                    key={key}
                    className="whitespace-nowrap px-2 py-2 font-medium"
                    title={calcPorKey.get(key)?.ajuda ?? campoPorKey.get(key)?.ajuda}
                  >
                    {campoPorKey.get(key)?.label ?? calcPorKey.get(key)?.label}
                    {calcPorKey.has(key) && <span className="ml-0.5 text-primary">*</span>}
                  </th>
                ))}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => (
                <tr
                  key={l.reg.id}
                  className={cn("border-b border-border/60 hover:bg-border/20", l.alerta && "bg-warning/10")}
                >
                  <td className="px-2 py-1.5">
                    {l.alerta && (
                      <span title={l.alerta}>
                        <AlertTriangle size={13} className="text-warning" />
                      </span>
                    )}
                  </td>
                  {config.colunas.map((key) => {
                    const v = valorColuna(l, key);
                    const fmt = formatoColuna(key);
                    const numero = typeof v === "number";
                    return (
                      <td
                        key={key}
                        className={cn(
                          "whitespace-nowrap px-2 py-1.5",
                          numero && "text-right tabular-nums",
                          numero && (v as number) < 0 && "text-danger",
                          calcPorKey.has(key) && "font-medium"
                        )}
                      >
                        {formatarValor(v ?? null, fmt)}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    <button className="rounded p-1 hover:bg-border/60" title="Editar" onClick={() => abrirEdicao(l.reg)}>
                      <Pencil size={13} />
                    </button>
                    <button className="rounded p-1 hover:bg-border/60" title="Excluir" onClick={() => excluir(l.reg)}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={config.colunas.length + 2} className="px-2 py-8 text-center text-muted">
                    Nenhum lancamento.
                  </td>
                </tr>
              )}
            </tbody>
            {(config.totais?.length ?? 0) > 0 && filtradas.length > 0 && (
              <tfoot className="sticky bottom-0 bg-card">
                <tr className="border-t border-border font-semibold">
                  <td className="px-2 py-2" />
                  {config.colunas.map((key, i) => (
                    <td key={key} className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
                      {key in totais ? formatarValor(totais[key], formatoColuna(key)) : i === 0 ? "TOTAL" : ""}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted">
          <span>
            {filtradas.length.toLocaleString("pt-BR")} lancamento(s) - * coluna calculada (passe o mouse no titulo para ver a
            formula)
          </span>
          {paginas > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>
                Anterior
              </Button>
              <span>
                {paginaAtual + 1} / {paginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual >= paginas - 1}
                onClick={() => setPagina(paginaAtual + 1)}
              >
                Proxima
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent title={editandoId ? `Editar - ${config.label}` : `Novo lancamento - ${config.label}`} className="max-w-3xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {config.campos.map((c) => (
              <div key={c.key}>
                <Label>
                  {c.label}
                  {c.obrigatorio && <span className="text-danger"> *</span>}
                </Label>
                {c.tipo === "opcao" ? (
                  <Select value={form[c.key] ?? ""} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}>
                    <option value="">Selecione...</option>
                    {/* Mantem um valor antigo fora da lista para nao perder a selecao ao editar. */}
                    {form[c.key] && !c.opcoes?.includes(form[c.key]) && <option value={form[c.key]}>{form[c.key]}</option>}
                    {c.opcoes?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <>
                    <Input
                      type={c.tipo === "data" ? "date" : "text"}
                      inputMode={c.tipo === "numero" ? "decimal" : undefined}
                      list={sugestoes[c.key] ? `sug-${c.key}` : undefined}
                      value={form[c.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    />
                    {sugestoes[c.key] && (
                      <datalist id={`sug-${c.key}`}>
                        {sugestoes[c.key].map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    )}
                  </>
                )}
                {c.ajuda && <p className="mt-1 text-[11px] text-muted">{c.ajuda}</p>}
              </div>
            ))}
          </div>

          {previa.calc.length > 0 && (
            <div className="mt-4 rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-medium text-muted">Calculado automaticamente</p>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {previa.calc.map(({ c, v }) => (
                  <div key={c.key}>
                    <p className="text-[11px] text-muted">{c.label}</p>
                    <p className={cn("font-medium tabular-nums", typeof v === "number" && v < 0 && "text-danger")}>
                      {v === null ? "-" : formatarValor(v, c.formato)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {previa.alerta && (
            <p className="mt-3 flex items-center gap-2 text-sm text-warning">
              <AlertTriangle size={14} /> {previa.alerta}
            </p>
          )}
          {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
