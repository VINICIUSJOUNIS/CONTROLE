"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCompactCurrency, formatCurrency, formatCurrencyPrecise, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BudgetPlanData, BudgetGroupData, BudgetLineData } from "@/lib/budget-data";
import { BUDGET_GROUP_ORDER, SCENARIO_LABELS } from "@/lib/budget-constants";
import {
  upsertBudgetVolumeMonths,
  upsertBudgetLineMonths,
  updateBudgetLineCusto,
  createBudgetLine,
  renameBudgetLine,
  deleteBudgetLine,
  BudgetVolumeMonthInput,
  BudgetLineMonthInput,
} from "@/app/(dashboard)/planejamento-orcamentario/actions";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ChevronDown,
  ChevronRight,
  Settings,
  Ship,
  Package,
  TextCursorInput,
} from "lucide-react";

type BudgetGroup = (typeof BUDGET_GROUP_ORDER)[number];

function varPercent(previsto: number, realizado: number) {
  if (!previsto) return null;
  return ((realizado - previsto) / Math.abs(previsto)) * 100;
}

// Base do ano anterior para o % de crescimento dos cards: vendas reais
// (menos devolucoes) dos ultimos 12 meses fechados.
export type AnoAnteriorBase = { rotulo: string; volume: number; volInt: number; volExt: number; receita: number };

function variacaoPct(anterior: number, atual: number) {
  if (!(anterior > 0)) return null;
  return ((atual - anterior) / anterior) * 100;
}

export function PlanejamentoView({ plan, anoAnterior }: { plan: NonNullable<BudgetPlanData>; anoAnterior?: AnoAnteriorBase | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [openVolumes, setOpenVolumes] = useState(false);
  const [volumesForm, setVolumesForm] = useState(() =>
    plan.months.map((m) => ({
      month: m.month,
      volumeBaseSacas: String(m.volumeBaseSacas),
      volumeExternoSacas: String(m.volumeExternoPrevisto ? m.volumeExternoPrevisto : 0),
      volumeInternoRealizado: String(m.volumeInternoRealizado),
      volumeExternoRealizado: String(m.volumeExternoRealizado),
      receitaRealizada: String(m.receitaRealizada),
    }))
  );

  const [openLine, setOpenLine] = useState(false);
  const [editingLine, setEditingLine] = useState<BudgetLineData | null>(null);
  const [lineForm, setLineForm] = useState<{ month: number; previsto: string; realizado: string }[]>([]);
  const [custoForm, setCustoForm] = useState<{ tipo: "FIXO" | "POR_SACA"; valor: string; base: "TOTAL" | "INTERNO" | "EXTERNO" }>({
    tipo: "FIXO",
    valor: "",
    base: "TOTAL",
  });

  // Volume previsto do mes (cenario ativo) para a base escolhida - mesma conta
  // do servidor (budget-data.ts), so para mostrar o previsto por saca no dialogo.
  function volumeDoMes(idx: number, base: "TOTAL" | "INTERNO" | "EXTERNO") {
    const m = plan.months[idx];
    return base === "EXTERNO" ? m.volumeExternoPrevisto : base === "INTERNO" ? m.volumeInternoPrevisto : m.volumeAjustado;
  }
  const previstoPorSaca = (idx: number) =>
    Number(((Number(custoForm.valor) || 0) * volumeDoMes(idx, custoForm.base)).toFixed(2));

  const [openNewLine, setOpenNewLine] = useState(false);
  const [newLineGroup, setNewLineGroup] = useState<BudgetGroup | null>(null);
  const [newLineName, setNewLineName] = useState("");

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function openVolumesDialog() {
    setVolumesForm(
      plan.months.map((m) => ({
        month: m.month,
        volumeBaseSacas: String(m.volumeBaseSacas),
        volumeExternoSacas: String(m.volumeExternoPrevisto),
        volumeInternoRealizado: String(m.volumeInternoRealizado),
        volumeExternoRealizado: String(m.volumeExternoRealizado),
        receitaRealizada: String(m.receitaRealizada),
      }))
    );
    setOpenVolumes(true);
  }

  function handleSaveVolumes() {
    const rows: BudgetVolumeMonthInput[] = volumesForm.map((r) => ({
      month: r.month,
      volumeBaseSacas: Number(r.volumeBaseSacas) || 0,
      volumeExternoSacas: Number(r.volumeExternoSacas) || 0,
      volumeInternoRealizado: Number(r.volumeInternoRealizado) || 0,
      volumeExternoRealizado: Number(r.volumeExternoRealizado) || 0,
      receitaRealizada: Number(r.receitaRealizada) || 0,
    }));
    startTransition(async () => {
      await upsertBudgetVolumeMonths(plan.id, rows);
      setOpenVolumes(false);
      router.refresh();
    });
  }

  function openLineDialog(line: BudgetLineData) {
    setEditingLine(line);
    setLineForm(line.months.map((m) => ({ month: m.month, previsto: String(m.previsto), realizado: String(m.realizado) })));
    setCustoForm({
      tipo: line.tipoCusto,
      valor: line.tipoCusto === "POR_SACA" ? String(line.valorPorSaca) : "",
      base: line.baseVolume,
    });
    setOpenLine(true);
  }

  function handleSaveLine() {
    if (!editingLine) return;
    const porSaca = custoForm.tipo === "POR_SACA";
    const rows: BudgetLineMonthInput[] = lineForm.map((r, idx) => ({
      month: r.month,
      // Por saca o previsto e recalculado na leitura; grava o valor do momento
      // so para nao perder a referencia se a linha voltar a ser fixa.
      valorPrevisto: porSaca ? previstoPorSaca(idx) : Number(r.previsto) || 0,
      valorRealizado: Number(r.realizado) || 0,
    }));
    startTransition(async () => {
      await updateBudgetLineCusto(editingLine.id, {
        tipoCusto: custoForm.tipo,
        valorPorSaca: porSaca ? Number(custoForm.valor) || 0 : 0,
        baseVolume: custoForm.base,
      });
      await upsertBudgetLineMonths(editingLine.id, rows);
      setOpenLine(false);
      router.refresh();
    });
  }

  function handleRenameLine(line: BudgetLineData) {
    const name = window.prompt("Novo nome da linha:", line.name);
    if (!name || !name.trim() || name.trim() === line.name) return;
    startTransition(async () => {
      await renameBudgetLine(line.id, name.trim());
      router.refresh();
    });
  }

  function handleDeleteLine(line: BudgetLineData) {
    if (!window.confirm(`Excluir a linha "${line.name}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      await deleteBudgetLine(line.id);
      router.refresh();
    });
  }

  function openNewLineDialog(group: BudgetGroup) {
    setNewLineGroup(group);
    setNewLineName("");
    setOpenNewLine(true);
  }

  function handleCreateLine() {
    if (!newLineGroup || !newLineName.trim()) return;
    startTransition(async () => {
      await createBudgetLine(plan.id, newLineGroup, newLineName.trim());
      setOpenNewLine(false);
      router.refresh();
    });
  }

  const resultadoRealizadoPercent =
    plan.totais.receitaRealizada > 0 ? (plan.totais.resultadoRealizado / plan.totais.receitaRealizada) * 100 : 0;

  // Volume do ano (cenario exibido): previsto = volume base x crescimento do
  // cenario; realizado = digitado mes a mes.
  const somaMeses = (k: "volumeAjustado" | "volumeInternoPrevisto" | "volumeExternoPrevisto" | "volumeInternoRealizado" | "volumeExternoRealizado") =>
    plan.months.reduce((acc, m) => acc + m[k], 0);
  const volPrevisto = somaMeses("volumeAjustado");
  const volIntPrevisto = somaMeses("volumeInternoPrevisto");
  const volExtPrevisto = somaMeses("volumeExternoPrevisto");
  const volIntRealizado = somaMeses("volumeInternoRealizado");
  const volExtRealizado = somaMeses("volumeExternoRealizado");
  const volRealizado = volIntRealizado + volExtRealizado;
  const sc = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  const receitaPorSaca = volPrevisto > 0 ? plan.totais.receitaPrevista / volPrevisto : 0;
  const despesaPorSaca = volPrevisto > 0 ? plan.totais.despesaPrevista / volPrevisto : null;
  const fmtVar = (v: number | null) =>
    v === null ? undefined : `${v >= 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const varVol = anoAnterior ? variacaoPct(anoAnterior.volume, volPrevisto) : null;
  const varVolInt = anoAnterior ? variacaoPct(anoAnterior.volInt, volIntPrevisto) : null;
  const varVolExt = anoAnterior ? variacaoPct(anoAnterior.volExt, volExtPrevisto) : null;
  const varRec = anoAnterior ? variacaoPct(anoAnterior.receita, plan.totais.receitaPrevista) : null;
  const peSacas =
    plan.pontoEquilibrio.valorReais !== null && receitaPorSaca > 0 ? plan.pontoEquilibrio.valorReais / receitaPorSaca : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          Cenário exibido: <span className="font-semibold text-foreground">{SCENARIO_LABELS[plan.scenario]}</span>. Os botões simulam o
          cenário nesta página; o cenário salvo no plano muda em Premissas.
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SCENARIO_LABELS) as (keyof typeof SCENARIO_LABELS)[]).map((c) => (
            <Link
              key={c}
              href={`/planejamento-orcamentario?year=${plan.year}&cenario=${c}`}
              scroll={false}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                plan.scenario === c ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-primary/5"
              )}
            >
              {SCENARIO_LABELS[c]}
              {plan.scenarioSalvo === c && <span className="ml-1 text-[10px] opacity-80">(ativo no plano)</span>}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Volume Previsto (${SCENARIO_LABELS[plan.scenario]})`}
          value={`${sc(volPrevisto)} sc`}
          icon={Package}
          tone="teal"
          trend={fmtVar(varVol)}
          trendPositive={(varVol ?? 0) >= 0}
          trendLabel={anoAnterior ? `vs ${sc(anoAnterior.volume)} sc em ${anoAnterior.rotulo}` : undefined}
          detalhe={`Interno ${sc(volIntPrevisto)} sc${varVolInt !== null ? ` (${fmtVar(varVolInt)})` : ""} · Externo ${sc(volExtPrevisto)} sc${varVolExt !== null ? ` (${fmtVar(varVolExt)})` : ""}`}
        />
        <KpiCard
          label="Volume Realizado"
          value={`${sc(volRealizado)} sc`}
          icon={Package}
          tone="green"
          trendLabel={`Interno ${sc(volIntRealizado)} sc · Externo ${sc(volExtRealizado)} sc`}
        />
        <KpiCard
          label="Despesa Prevista por Saca"
          value={despesaPorSaca !== null ? formatCurrencyPrecise(despesaPorSaca) : "-"}
          icon={TrendingDown}
          tone="soft"
          trendLabel={`Receita prevista por saca: ${receitaPorSaca > 0 ? formatCurrencyPrecise(receitaPorSaca) : "-"}`}
        />
        <KpiCard
          label="Ponto de Equilíbrio em Sacas"
          value={peSacas !== null ? `${sc(peSacas)} sc` : "-"}
          icon={Ship}
          tone="teal"
          trendLabel="Sacas a vender para cobrir os custos fixos"
        />
        <KpiCard
          label={`Receita Prevista (${SCENARIO_LABELS[plan.scenario]})`}
          value={formatCompactCurrency(plan.totais.receitaPrevista)}
          icon={TrendingUp}
          tone="teal"
          trend={fmtVar(varRec)}
          trendPositive={(varRec ?? 0) >= 0}
          trendLabel={anoAnterior ? `vs ${formatCompactCurrency(anoAnterior.receita)} em ${anoAnterior.rotulo}` : undefined}
        />
        <KpiCard
          label="Despesa Prevista"
          value={formatCompactCurrency(plan.totais.despesaPrevista)}
          icon={TrendingDown}
          tone="soft"
        />
        <KpiCard
          label="Resultado Previsto"
          value={formatCompactCurrency(plan.totais.resultadoPrevisto)}
          icon={Wallet}
          tone="green"
        />
        <KpiCard
          label="Resultado Realizado"
          value={`${formatCompactCurrency(plan.totais.resultadoRealizado)} (${formatPercent(resultadoRealizadoPercent, 1)})`}
          icon={PiggyBank}
          tone="teal"
        />
        <KpiCard
          label="Ponto de Equilíbrio"
          value={plan.pontoEquilibrio.valorReais !== null ? formatCompactCurrency(plan.pontoEquilibrio.valorReais) : "-"}
          icon={Ship}
          tone="soft"
        />
        <KpiCard
          label="Caixa de Segurança (Bom / 6 meses)"
          value={formatCompactCurrency(plan.caixaSeguranca.bom)}
          icon={PiggyBank}
          tone="green"
        />
        <KpiCard
          label="Caixa de Segurança (Ótimo / 12 meses)"
          value={formatCompactCurrency(plan.caixaSeguranca.otimo)}
          icon={PiggyBank}
          tone="teal"
        />
        <KpiCard
          label="Caixa de Segurança (Excelente / 18 meses)"
          value={formatCompactCurrency(plan.caixaSeguranca.excelente)}
          icon={PiggyBank}
          tone="soft"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/planejamento-orcamentario/premissas"
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-xs font-medium transition-all hover:border-primary/40 hover:bg-accent-soft"
        >
          <Settings size={14} />
          Premissas do Plano
        </Link>
        <Button variant="outline" size="sm" onClick={openVolumesDialog}>
          <Ship size={14} />
          Volume e Receita (Interno x Externo)
        </Button>
      </div>

      <div className="space-y-3">
        {plan.groups.map((g) => (
          <GroupCard
            key={g.group}
            groupData={g}
            expanded={expandedGroups.has(g.group)}
            onToggle={() => toggleGroup(g.group)}
            onEditLine={openLineDialog}
            onRenameLine={handleRenameLine}
            onDeleteLine={handleDeleteLine}
            onNewLine={() => openNewLineDialog(g.group)}
          />
        ))}
      </div>

      {/* Volume e Receita */}
      <Dialog open={openVolumes} onOpenChange={setOpenVolumes}>
        <DialogContent title="Volume em Sacas e Receita (Mercado Interno x Externo)" className="max-w-3xl">
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Volume Base e Volume Externo são o Previsto (cenário Conservador, antes do crescimento do cenário
              ativo); Volume Interno Previsto = Volume Base − Volume Externo. Realizado e Receita Realizada são
              digitados mês a mês.
            </p>
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
              <table className="w-full whitespace-nowrap text-xs">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-2 py-2 font-medium">Mês</th>
                    <th className="px-2 py-2 font-medium">Volume Base (sacas)</th>
                    <th className="px-2 py-2 font-medium">Volume Externo Previsto</th>
                    <th className="px-2 py-2 font-medium">Volume Interno Realizado</th>
                    <th className="px-2 py-2 font-medium">Volume Externo Realizado</th>
                    <th className="px-2 py-2 font-medium">Receita Realizada (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {volumesForm.map((row, idx) => (
                    <tr key={row.month} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-1.5 font-medium">{plan.months[idx].label}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-28"
                          value={row.volumeBaseSacas}
                          onChange={(e) => {
                            const next = [...volumesForm];
                            next[idx] = { ...next[idx], volumeBaseSacas: e.target.value };
                            setVolumesForm(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-28"
                          value={row.volumeExternoSacas}
                          onChange={(e) => {
                            const next = [...volumesForm];
                            next[idx] = { ...next[idx], volumeExternoSacas: e.target.value };
                            setVolumesForm(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-28"
                          value={row.volumeInternoRealizado}
                          onChange={(e) => {
                            const next = [...volumesForm];
                            next[idx] = { ...next[idx], volumeInternoRealizado: e.target.value };
                            setVolumesForm(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-28"
                          value={row.volumeExternoRealizado}
                          onChange={(e) => {
                            const next = [...volumesForm];
                            next[idx] = { ...next[idx], volumeExternoRealizado: e.target.value };
                            setVolumesForm(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-32"
                          value={row.receitaRealizada}
                          onChange={(e) => {
                            const next = [...volumesForm];
                            next[idx] = { ...next[idx], receitaRealizada: e.target.value };
                            setVolumesForm(next);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="w-full" onClick={handleSaveVolumes} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar volumes e receita"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar linha (12 meses) */}
      <Dialog open={openLine} onOpenChange={setOpenLine}>
        <DialogContent title={editingLine ? `Editar valores: ${editingLine.name}` : "Editar valores"} className="max-w-2xl">
          <div className="space-y-3">
            <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
              <div>
                <Label>Tipo de custo</Label>
                <Select
                  value={custoForm.tipo}
                  onChange={(e) => setCustoForm({ ...custoForm, tipo: e.target.value as "FIXO" | "POR_SACA" })}
                >
                  <option value="FIXO">Valor fixo por mês</option>
                  <option value="POR_SACA">Por saca</option>
                </Select>
              </div>
              {custoForm.tipo === "POR_SACA" && (
                <>
                  <div>
                    <Label>Valor por saca (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex.: 6,00"
                      value={custoForm.valor}
                      onChange={(e) => setCustoForm({ ...custoForm, valor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Incide sobre</Label>
                    <Select
                      value={custoForm.base}
                      onChange={(e) => setCustoForm({ ...custoForm, base: e.target.value as "TOTAL" | "INTERNO" | "EXTERNO" })}
                    >
                      <option value="TOTAL">Volume total</option>
                      <option value="INTERNO">Volume mercado interno</option>
                      <option value="EXTERNO">Volume mercado externo</option>
                    </Select>
                  </div>
                  <p className="text-[11px] text-muted sm:col-span-3">
                    Previsto de cada mês = valor por saca × sacas previstas do mês no cenário {SCENARIO_LABELS[plan.scenario]}. Atualiza sozinho
                    quando o volume ou o cenário do plano mudam. O realizado continua digitado.
                  </p>
                </>
              )}
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
              <table className="w-full whitespace-nowrap text-xs">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-2 py-2 font-medium">Mês</th>
                    {custoForm.tipo === "POR_SACA" && <th className="px-2 py-2 font-medium">Sacas</th>}
                    <th className="px-2 py-2 font-medium">Previsto (R$)</th>
                    <th className="px-2 py-2 font-medium">Realizado (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {lineForm.map((row, idx) => (
                    <tr key={row.month} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-1.5 font-medium">{plan.months[idx].label}</td>
                      {custoForm.tipo === "POR_SACA" && (
                        <td className="px-2 py-1.5 tabular-nums text-muted">
                          {volumeDoMes(idx, custoForm.base).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-32"
                          disabled={custoForm.tipo === "POR_SACA"}
                          value={custoForm.tipo === "POR_SACA" ? String(previstoPorSaca(idx)) : row.previsto}
                          onChange={(e) => {
                            const next = [...lineForm];
                            next[idx] = { ...next[idx], previsto: e.target.value };
                            setLineForm(next);
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-32"
                          value={row.realizado}
                          onChange={(e) => {
                            const next = [...lineForm];
                            next[idx] = { ...next[idx], realizado: e.target.value };
                            setLineForm(next);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="w-full" onClick={handleSaveLine} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar valores"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nova linha */}
      <Dialog open={openNewLine} onOpenChange={setOpenNewLine}>
        <DialogContent title="Nova linha de despesa">
          <div className="space-y-3">
            <div>
              <Label>Nome da linha</Label>
              <Input value={newLineName} onChange={(e) => setNewLineName(e.target.value)} placeholder="Ex.: Nova despesa" />
            </div>
            <Button className="w-full" onClick={handleCreateLine} disabled={isPending || !newLineName.trim()}>
              {isPending ? "Salvando..." : "Adicionar linha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GroupCard({
  groupData,
  expanded,
  onToggle,
  onEditLine,
  onRenameLine,
  onDeleteLine,
  onNewLine,
}: {
  groupData: BudgetGroupData;
  expanded: boolean;
  onToggle: () => void;
  onEditLine: (line: BudgetLineData) => void;
  onRenameLine: (line: BudgetLineData) => void;
  onDeleteLine: (line: BudgetLineData) => void;
  onNewLine: () => void;
}) {
  const varPct = varPercent(groupData.totalPrevisto, groupData.totalRealizado);
  return (
    <Card>
      <CardContent className="p-0">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-border/20"
        >
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="font-medium">{groupData.label}</span>
            <span className="text-xs text-muted">({groupData.lines.length} linhas)</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">Previsto: {formatCurrency(groupData.totalPrevisto)}</span>
            <span className="font-medium">Realizado: {formatCurrency(groupData.totalRealizado)}</span>
            {varPct !== null && (
              <span className={varPct > 0 ? "text-danger" : "text-success"}>{formatPercent(varPct, 1)}</span>
            )}
          </div>
        </button>
        {expanded && (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Linha</th>
                  <th className="px-2 py-2 text-center font-medium">Por saca?</th>
                  <th className="px-2 py-2 font-medium">R$ por saca</th>
                  <th className="px-2 py-2 font-medium">Incide sobre</th>
                  <th className="px-3 py-2 font-medium">Total Previsto</th>
                  <th className="px-3 py-2 font-medium">Total Realizado</th>
                  <th className="px-3 py-2 font-medium">Var %</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {groupData.lines.map((line) => {
                  const lineVar = varPercent(line.totalPrevisto, line.totalRealizado);
                  return (
                    <tr key={line.id} className="border-b border-border/60 last:border-0 hover:bg-border/10">
                      <td className="px-3 py-2">{line.name}</td>
                      <CustoPorSacaCelulas line={line} />
                      <td className="px-3 py-2">{formatCurrency(line.totalPrevisto)}</td>
                      <td className="px-3 py-2">{formatCurrency(line.totalRealizado)}</td>
                      <td className={`px-3 py-2 ${lineVar !== null && lineVar > 0 ? "text-danger" : "text-success"}`}>
                        {lineVar !== null ? formatPercent(lineVar, 1) : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => onEditLine(line)}
                            className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                            title="Editar valores mensais"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => onRenameLine(line)}
                            className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                            title="Renomear"
                            aria-label="Renomear"
                          >
                            <TextCursorInput size={13} />
                          </button>
                          <button
                            onClick={() => onDeleteLine(line)}
                            className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {groupData.lines.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-muted">
                      Nenhuma linha cadastrada neste grupo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="p-3">
              <Button variant="outline" size="sm" onClick={onNewLine}>
                <Plus size={14} />
                Nova linha
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Marcacao direto na lista: a linha e custo por saca? qual o R$/saca e sobre
// qual volume incide. Grava ao marcar/desmarcar, ao trocar a base e ao sair do
// campo de valor (ou Enter). Previsto por saca = R$/saca x sacas do mes no
// cenario ativo (calculado em budget-data.ts).
function CustoPorSacaCelulas({ line }: { line: BudgetLineData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const porSaca = line.tipoCusto === "POR_SACA";
  const [valor, setValor] = useState(porSaca ? String(line.valorPorSaca) : "");

  function salvar(next: { tipoCusto: "FIXO" | "POR_SACA"; valorPorSaca: number; baseVolume: "TOTAL" | "INTERNO" | "EXTERNO" }) {
    startTransition(async () => {
      await updateBudgetLineCusto(line.id, next);
      router.refresh();
    });
  }

  function salvarValor() {
    const v = Number(valor.replace(",", ".")) || 0;
    if (v === line.valorPorSaca) return;
    salvar({ tipoCusto: "POR_SACA", valorPorSaca: v, baseVolume: line.baseVolume });
  }

  return (
    <>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          aria-label={`${line.name}: custo por saca`}
          className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
          checked={porSaca}
          disabled={isPending}
          onChange={(e) =>
            salvar({
              tipoCusto: e.target.checked ? "POR_SACA" : "FIXO",
              valorPorSaca: e.target.checked ? Number(valor.replace(",", ".")) || 0 : 0,
              baseVolume: line.baseVolume,
            })
          }
        />
      </td>
      <td className="px-2 py-2">
        {porSaca ? (
          <Input
            type="number"
            step="0.01"
            placeholder="0,00"
            className="h-8 w-24"
            value={valor}
            disabled={isPending}
            onChange={(e) => setValor(e.target.value)}
            onBlur={salvarValor}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <span className="text-muted">-</span>
        )}
      </td>
      <td className="px-2 py-2">
        {porSaca ? (
          <Select
            className="h-8 w-40"
            value={line.baseVolume}
            disabled={isPending}
            onChange={(e) =>
              salvar({
                tipoCusto: "POR_SACA",
                valorPorSaca: Number(valor.replace(",", ".")) || 0,
                baseVolume: e.target.value as "TOTAL" | "INTERNO" | "EXTERNO",
              })
            }
          >
            <option value="TOTAL">Volume total</option>
            <option value="INTERNO">Mercado interno</option>
            <option value="EXTERNO">Mercado externo</option>
          </Select>
        ) : (
          <span className="text-muted">-</span>
        )}
      </td>
    </>
  );
}
