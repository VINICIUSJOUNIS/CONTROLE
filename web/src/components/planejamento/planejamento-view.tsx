"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PieChartCard } from "@/components/charts/pie-chart-card";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { BudgetPlanData, BudgetGroupData, BudgetLineData } from "@/lib/budget-data";
import { BUDGET_GROUP_ORDER, SCENARIO_LABELS } from "@/lib/budget-constants";
import {
  updateBudgetPlanAssumptions,
  upsertBudgetVolumeMonths,
  upsertBudgetLineMonths,
  createBudgetLine,
  renameBudgetLine,
  deleteBudgetLine,
  BudgetPlanAssumptionsInput,
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
} from "lucide-react";

type BudgetGroup = (typeof BUDGET_GROUP_ORDER)[number];

const GROUP_COLORS: Record<BudgetGroup, string> = {
  CUSTO_FORNECEDOR: "#1c8388",
  DESPESA_MERCADO_INTERNO: "#7a5af8",
  DESPESA_MERCADO_EXTERNO: "#12b76a",
  DESPESA_ADM_FIXA: "#d68c2b",
  DESPESA_ADM_VARIAVEL: "#f0ac4c",
  DESPESA_PESSOAL: "#f04438",
  IMPOSTOS: "#e5776b",
  FINANCIAMENTO: "#a8c5c8",
  INVESTIMENTOS: "#9fc3c5",
};

function varPercent(previsto: number, realizado: number) {
  if (!previsto) return null;
  return ((realizado - previsto) / Math.abs(previsto)) * 100;
}

export function PlanejamentoView({ plan }: { plan: NonNullable<BudgetPlanData> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [openAssumptions, setOpenAssumptions] = useState(false);
  const [assumptionsForm, setAssumptionsForm] = useState(() => ({
    name: plan.name,
    scenario: plan.scenario,
    cotacaoSacaUsd: String(plan.cotacaoSacaUsd),
    cotacaoDolar: String(plan.cotacaoDolar),
    crescimentoModerado: String(plan.crescimentoModerado * 100),
    crescimentoOtimista: String(plan.crescimentoOtimista * 100),
    crescimentoMuitoOtimista: String(plan.crescimentoMuitoOtimista * 100),
  }));

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

  const [openNewLine, setOpenNewLine] = useState(false);
  const [newLineGroup, setNewLineGroup] = useState<BudgetGroup | null>(null);
  const [newLineName, setNewLineName] = useState("");

  const custoChartData = useMemo(
    () =>
      plan.groups
        .filter((g) => g.totalPrevisto > 0 || g.totalRealizado > 0)
        .map((g) => ({ name: g.label, value: g.totalPrevisto, color: GROUP_COLORS[g.group] })),
    [plan.groups]
  );

  const receitaEvolucaoData = useMemo(
    () => plan.months.map((m) => ({ mes: m.label.slice(0, 3), Previsto: m.receitaPrevista, Realizado: m.receitaRealizada })),
    [plan.months]
  );

  const resultadoEvolucaoData = useMemo(
    () => plan.months.map((m) => ({ mes: m.label.slice(0, 3), Previsto: m.resultadoPrevisto, Realizado: m.resultadoRealizado })),
    [plan.months]
  );

  const groupChartData = useMemo(
    () =>
      plan.groups
        .filter((g) => g.totalPrevisto > 0 || g.totalRealizado > 0)
        .map((g) => ({ grupo: g.label, Previsto: g.totalPrevisto, Realizado: g.totalRealizado })),
    [plan.groups]
  );

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function openAssumptionsDialog() {
    setAssumptionsForm({
      name: plan.name,
      scenario: plan.scenario,
      cotacaoSacaUsd: String(plan.cotacaoSacaUsd),
      cotacaoDolar: String(plan.cotacaoDolar),
      crescimentoModerado: String(plan.crescimentoModerado * 100),
      crescimentoOtimista: String(plan.crescimentoOtimista * 100),
      crescimentoMuitoOtimista: String(plan.crescimentoMuitoOtimista * 100),
    });
    setOpenAssumptions(true);
  }

  function handleSaveAssumptions() {
    const payload: BudgetPlanAssumptionsInput = {
      name: assumptionsForm.name.trim() || plan.name,
      scenario: assumptionsForm.scenario,
      cotacaoSacaUsd: Number(assumptionsForm.cotacaoSacaUsd) || 0,
      cotacaoDolar: Number(assumptionsForm.cotacaoDolar) || 0,
      crescimentoModerado: (Number(assumptionsForm.crescimentoModerado) || 0) / 100,
      crescimentoOtimista: (Number(assumptionsForm.crescimentoOtimista) || 0) / 100,
      crescimentoMuitoOtimista: (Number(assumptionsForm.crescimentoMuitoOtimista) || 0) / 100,
    };
    startTransition(async () => {
      await updateBudgetPlanAssumptions(plan.id, payload);
      setOpenAssumptions(false);
      router.refresh();
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
    setOpenLine(true);
  }

  function handleSaveLine() {
    if (!editingLine) return;
    const rows: BudgetLineMonthInput[] = lineForm.map((r) => ({
      month: r.month,
      valorPrevisto: Number(r.previsto) || 0,
      valorRealizado: Number(r.realizado) || 0,
    }));
    startTransition(async () => {
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Receita Prevista (${SCENARIO_LABELS[plan.scenario]})`}
          value={formatCompactCurrency(plan.totais.receitaPrevista)}
          icon={TrendingUp}
          tone="teal"
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
        <Button variant="outline" size="sm" onClick={openAssumptionsDialog}>
          <Settings size={14} />
          Premissas do Plano
        </Button>
        <Button variant="outline" size="sm" onClick={openVolumesDialog}>
          <Ship size={14} />
          Volume e Receita (Interno x Externo)
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LineChartCard
            title="Receita: Previsto x Realizado"
            data={receitaEvolucaoData}
            xKey="mes"
            series={[
              { key: "Previsto", name: "Previsto", color: "#1c8388" },
              { key: "Realizado", name: "Realizado", color: "#12b76a" },
            ]}
            valueFormat="currency"
          />
        </div>
        <PieChartCard title="Despesas Previstas por Grupo" data={custoChartData} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartCard
          title="Resultado: Previsto x Realizado"
          data={resultadoEvolucaoData}
          xKey="mes"
          series={[
            { key: "Previsto", name: "Previsto", color: "#7a5af8" },
            { key: "Realizado", name: "Realizado", color: "#f0ac4c" },
          ]}
          valueFormat="currency"
        />
        <BarChartCard
          title="Despesas por Grupo: Previsto x Realizado"
          data={groupChartData}
          xKey="grupo"
          series={[
            { key: "Previsto", name: "Previsto", color: "#a8c5c8" },
            { key: "Realizado", name: "Realizado", color: "#1c8388" },
          ]}
          valueFormat="currency"
        />
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

      {/* Premissas do Plano */}
      <Dialog open={openAssumptions} onOpenChange={setOpenAssumptions}>
        <DialogContent title="Premissas do Plano Orçamentário">
          <div className="space-y-3">
            <div>
              <Label>Nome do Plano</Label>
              <Input
                value={assumptionsForm.name}
                onChange={(e) => setAssumptionsForm({ ...assumptionsForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Cenário Ativo</Label>
              <Select
                value={assumptionsForm.scenario}
                onChange={(e) =>
                  setAssumptionsForm({ ...assumptionsForm, scenario: e.target.value as typeof plan.scenario })
                }
              >
                {Object.entries(SCENARIO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cotação Saca (US$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={assumptionsForm.cotacaoSacaUsd}
                  onChange={(e) => setAssumptionsForm({ ...assumptionsForm, cotacaoSacaUsd: e.target.value })}
                />
              </div>
              <div>
                <Label>Cotação Dólar (R$)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={assumptionsForm.cotacaoDolar}
                  onChange={(e) => setAssumptionsForm({ ...assumptionsForm, cotacaoDolar: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted">
              Crescimento de volume sobre o cenário Conservador (0%), aplicado ao Volume Base em Sacas para
              projetar a receita de cada cenário.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Moderado (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={assumptionsForm.crescimentoModerado}
                  onChange={(e) => setAssumptionsForm({ ...assumptionsForm, crescimentoModerado: e.target.value })}
                />
              </div>
              <div>
                <Label>Otimista (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={assumptionsForm.crescimentoOtimista}
                  onChange={(e) => setAssumptionsForm({ ...assumptionsForm, crescimentoOtimista: e.target.value })}
                />
              </div>
              <div>
                <Label>Muito Otimista (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={assumptionsForm.crescimentoMuitoOtimista}
                  onChange={(e) =>
                    setAssumptionsForm({ ...assumptionsForm, crescimentoMuitoOtimista: e.target.value })
                  }
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveAssumptions} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar premissas"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
              <table className="w-full whitespace-nowrap text-xs">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-2 py-2 font-medium">Mês</th>
                    <th className="px-2 py-2 font-medium">Previsto (R$)</th>
                    <th className="px-2 py-2 font-medium">Realizado (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {lineForm.map((row, idx) => (
                    <tr key={row.month} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-1.5 font-medium">{plan.months[idx].label}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-32"
                          value={row.previsto}
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
          <div className="border-t border-border">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">Linha</th>
                  <th className="px-4 py-2 font-medium">Total Previsto</th>
                  <th className="px-4 py-2 font-medium">Total Realizado</th>
                  <th className="px-4 py-2 font-medium">Var %</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {groupData.lines.map((line) => {
                  const lineVar = varPercent(line.totalPrevisto, line.totalRealizado);
                  return (
                    <tr key={line.id} className="border-b border-border/60 last:border-0 hover:bg-border/10">
                      <td className="px-4 py-2">{line.name}</td>
                      <td className="px-4 py-2">{formatCurrency(line.totalPrevisto)}</td>
                      <td className="px-4 py-2">{formatCurrency(line.totalRealizado)}</td>
                      <td className={`px-4 py-2 ${lineVar !== null && lineVar > 0 ? "text-danger" : "text-success"}`}>
                        {lineVar !== null ? formatPercent(lineVar, 1) : "-"}
                      </td>
                      <td className="px-4 py-2">
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
                            className="rounded-md px-1.5 py-1 text-[11px] text-muted hover:bg-border/60 hover:text-foreground"
                            title="Renomear"
                          >
                            renomear
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
                    <td colSpan={5} className="px-4 py-4 text-center text-muted">
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
