"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ExplicacaoSecoes } from "@/components/dashboard/kpi-explicacao";
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

// Base do % de crescimento dos cards: ano corrente estimado - vendas reais
// (menos devolucoes) dos meses ja fechados + meses que faltam pela media do
// mesmo mes nos dois anos anteriores.
export type AnoAnteriorBase = {
  rotulo: string;
  volume: number;
  volInt: number;
  volExt: number;
  receita: number;
  recInt: number;
  recExt: number;
  partes?: {
    realizado: string;
    projetado: string | null;
    realInt: { sacas: number; receita: number };
    realExt: { sacas: number; receita: number };
    projInt: { sacas: number; receita: number };
    projExt: { sacas: number; receita: number };
  };
};

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
  const [custoForm, setCustoForm] = useState<{ tipo: TipoCusto; valor: string; base: "TOTAL" | "INTERNO" | "EXTERNO" }>({
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
  // Receita prevista do mes na base escolhida (sacas x preco da saca do plano),
  // mesma conta do servidor, para o tipo percentual.
  function receitaDoMes(idx: number, base: "TOTAL" | "INTERNO" | "EXTERNO") {
    return volumeDoMes(idx, base) * plan.cotacaoSacaUsd * plan.cotacaoDolar;
  }
  const previstoPorSaca = (idx: number) =>
    custoForm.tipo === "MENSAL"
      ? Number((Number(custoForm.valor) || 0).toFixed(2))
      : custoForm.tipo === "PERCENTUAL"
      ? Number((((Number(custoForm.valor) || 0) / 100) * receitaDoMes(idx, custoForm.base)).toFixed(2))
      : Number(((Number(custoForm.valor) || 0) * volumeDoMes(idx, custoForm.base)).toFixed(2));
  // Mensal e por saca: o previsto e calculado (nao digitado).
  const previstoCalculado = custoForm.tipo !== "FIXO";

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
    setLineForm(line.months.map((m) => ({ month: m.month, previsto: String(m.previstoBase), realizado: String(m.realizado) })));
    setCustoForm({
      tipo: line.tipoCusto,
      valor:
        line.tipoCusto === "POR_SACA"
          ? String(line.valorPorSaca)
          : line.tipoCusto === "MENSAL"
          ? String(line.valorMensal)
          : line.tipoCusto === "PERCENTUAL"
          ? String(line.valorPercentual)
          : "",
      base: line.baseVolume,
    });
    setOpenLine(true);
  }

  function handleSaveLine() {
    if (!editingLine) return;
    const porSaca = custoForm.tipo === "POR_SACA";
    const calculado = custoForm.tipo !== "FIXO";
    const rows: BudgetLineMonthInput[] = lineForm.map((r, idx) => ({
      month: r.month,
      // Por saca o previsto e recalculado na leitura; grava o valor do momento
      // so para nao perder a referencia se a linha voltar a ser fixa.
      valorPrevisto: calculado ? previstoPorSaca(idx) : Number(r.previsto) || 0,
      valorRealizado: Number(r.realizado) || 0,
    }));
    startTransition(async () => {
      await updateBudgetLineCusto(editingLine.id, {
        tipoCusto: custoForm.tipo,
        valorPorSaca: porSaca ? Number(custoForm.valor) || 0 : editingLine.valorPorSaca,
        valorMensal: custoForm.tipo === "MENSAL" ? Number(custoForm.valor) || 0 : editingLine.valorMensal,
        valorPercentual: custoForm.tipo === "PERCENTUAL" ? Number(custoForm.valor) || 0 : editingLine.valorPercentual,
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
  // Receita prevista por mercado = sacas previstas do mercado x preco da saca
  // do plano (mesma conta da receita total).
  const precoSacaPlano = plan.cotacaoSacaUsd * plan.cotacaoDolar;
  const recIntPrevisto = volIntPrevisto * precoSacaPlano;
  const recExtPrevisto = volExtPrevisto * precoSacaPlano;
  const varRecInt = anoAnterior ? variacaoPct(anoAnterior.recInt, recIntPrevisto) : null;
  const varRecExt = anoAnterior ? variacaoPct(anoAnterior.recExt, recExtPrevisto) : null;
  const peSacas =
    plan.pontoEquilibrio.valorReais !== null && receitaPorSaca > 0 ? plan.pontoEquilibrio.valorReais / receitaPorSaca : null;

  // ---- Explicacoes da lupa de cada card (origem, calculo com os valores
  // atuais e logica). Mesmas variaveis usadas nos cards acima.
  const R = (v: number) => formatCurrencyPrecise(v);
  const P = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  const cen = SCENARIO_LABELS[plan.scenario];
  const crescI = plan.fatorDespesas.interno - 1;
  const crescE = plan.fatorDespesas.externo - 1;
  // Volume base (Conservador) de cada mercado = previsto ÷ fator do cenario.
  const volBaseInt = plan.fatorDespesas.interno > 0 ? volIntPrevisto / plan.fatorDespesas.interno : 0;
  const volBaseExt = plan.fatorDespesas.externo > 0 ? volExtPrevisto / plan.fatorDespesas.externo : 0;
  const sacaUsd = plan.cotacaoSacaUsd;
  const linhaPreco = `Preço da saca = (bolsa ${plan.nivelBolsa.toLocaleString("pt-BR")} + diferencial ${plan.diferencial.toLocaleString("pt-BR")} c/lb) × 1,3228 = US$ ${sacaUsd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × dólar ${plan.cotacaoDolar.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} = ${R(precoSacaPlano)}/saca`;
  const baseTexto = (
    <>
      Base de comparação ({anoAnterior?.rotulo ?? "-"}): vendas reais do sistema (menu Faturamento: vendas menos devoluções, 60 kg por
      saca) dos meses já fechados do ano; os meses que faltam são projetados pela média do mesmo mês nos dois anos anteriores.
    </>
  );
  const linhasBase = (k: "Int" | "Ext" | "Tot", tipo: "sacas" | "receita") => {
    const pt = anoAnterior?.partes;
    if (!pt) return [] as string[];
    const f = (v: number) => (tipo === "sacas" ? `${sc(v)} sc` : R(v));
    const pega = (o: { sacas: number; receita: number }) => o[tipo];
    const real = k === "Int" ? pega(pt.realInt) : k === "Ext" ? pega(pt.realExt) : pega(pt.realInt) + pega(pt.realExt);
    const proj = k === "Int" ? pega(pt.projInt) : k === "Ext" ? pega(pt.projExt) : pega(pt.projInt) + pega(pt.projExt);
    return [
      `Base: realizado ${pt.realizado} = ${f(real)}` + (pt.projetado ? ` + projetado ${pt.projetado} = ${f(proj)}` : ""),
      `Base total = ${f(real + proj)}`,
    ];
  };
  const varTexto = (prev: string, base: string, v: number | null) =>
    v === null ? "Sem base de comparação." : `Variação = ${prev} ÷ ${base} − 1 = ${fmtVar(v)}`;
  const gruposPrev = plan.groups.filter((g) => g.totalPrevisto !== 0);
  const exp = {
    volPrev: (
      <ExplicacaoSecoes
        origem={
          <>
            Volume base mês a mês gravado no plano (botão &quot;Volume e Receita (Interno x Externo)&quot; ou &quot;Gravar no plano&quot; da
            página Histórico e Projeções), com o crescimento do cenário {cen} definido em Premissas, separado por mercado. {baseTexto}
          </>
        }
        calculo={[
          `Interno: ${sc(volBaseInt)} sc (base) × (1 + ${P(crescI)}) = ${sc(volIntPrevisto)} sc`,
          `Externo: ${sc(volBaseExt)} sc (base) × (1 + ${P(crescE)}) = ${sc(volExtPrevisto)} sc`,
          `Volume previsto = ${sc(volIntPrevisto)} + ${sc(volExtPrevisto)} = ${sc(volPrevisto)} sc`,
          ...linhasBase("Tot", "sacas"),
          varTexto(`${sc(volPrevisto)}`, `${sc(anoAnterior?.volume ?? 0)}`, varVol),
        ]}
        logica="Quanto a empresa planeja vender no ano em sacas. O cenário Conservador é o volume base sem crescimento; os outros cenários aplicam o % de cada mercado sobre o volume daquele mercado. A variação mostra se o plano está acima ou abaixo do ritmo real deste ano."
      />
    ),
    volReal: (
      <ExplicacaoSecoes
        origem={<>Volume realizado digitado mês a mês no botão &quot;Volume e Receita (Interno x Externo)&quot; desta página.</>}
        calculo={[
          `Interno realizado (soma dos 12 meses) = ${sc(volIntRealizado)} sc`,
          `Externo realizado (soma dos 12 meses) = ${sc(volExtRealizado)} sc`,
          `Volume realizado = ${sc(volIntRealizado)} + ${sc(volExtRealizado)} = ${sc(volRealizado)} sc`,
        ]}
        logica="Acompanha o que já foi vendido de fato no ano do plano, para comparar com o volume previsto. Fica zerado enquanto os meses não forem preenchidos."
      />
    ),
    despSaca: (
      <ExplicacaoSecoes
        origem="Despesa prevista total (todas as linhas de despesa do plano) e volume previsto, ambos no cenário exibido."
        calculo={[
          `Despesa prevista = ${R(plan.totais.despesaPrevista)}`,
          `Volume previsto = ${sc(volPrevisto)} sc`,
          `Despesa por saca = ${R(plan.totais.despesaPrevista)} ÷ ${sc(volPrevisto)} = ${despesaPorSaca !== null ? R(despesaPorSaca) : "-"}`,
          `Receita por saca = ${R(plan.totais.receitaPrevista)} ÷ ${sc(volPrevisto)} = ${R(receitaPorSaca)}`,
          linhaPreco,
        ]}
        logica="Quanto custa, em média, cada saca vendida. Comparando com a receita por saca, mostra a margem por saca: receita por saca − despesa por saca."
      />
    ),
    peSacas: (
      <ExplicacaoSecoes
        origem="Ponto de equilíbrio em R$ (card Ponto de Equilíbrio) e receita prevista por saca."
        calculo={[
          `Ponto de equilíbrio = ${plan.pontoEquilibrio.valorReais !== null ? R(plan.pontoEquilibrio.valorReais) : "-"}`,
          `Receita por saca = ${R(receitaPorSaca)}`,
          `Sacas = ${plan.pontoEquilibrio.valorReais !== null ? R(plan.pontoEquilibrio.valorReais) : "-"} ÷ ${R(receitaPorSaca)} = ${peSacas !== null ? `${sc(peSacas)} sc` : "-"}`,
        ]}
        logica="Quantas sacas é preciso vender no ano para a receita cobrir os custos fixos e os variáveis, ou seja, resultado zero. Acima disso a empresa dá lucro."
      />
    ),
    recPrev: (
      <ExplicacaoSecoes
        origem={
          <>
            Volume previsto do cenário {cen} × preço da saca das Premissas (nível de bolsa + diferencial, convertidos pelo fator 1,3228,
            igual ao contrato de exportação, × dólar). {baseTexto}
          </>
        }
        calculo={[
          linhaPreco,
          `Receita prevista = ${sc(volPrevisto)} sc × ${R(precoSacaPlano)} = ${R(plan.totais.receitaPrevista)}`,
          ...linhasBase("Tot", "receita"),
          varTexto(R(plan.totais.receitaPrevista), R(anoAnterior?.receita ?? 0), varRec),
        ]}
        logica="Faturamento planejado para o ano. Muda junto com o volume do cenário e com a bolsa, o diferencial e o dólar das Premissas."
      />
    ),
    despPrev: (
      <ExplicacaoSecoes
        origem={
          <>
            Soma de todas as linhas dos grupos de despesa abaixo. Cada linha forma o previsto pelo tipo de custo: mês a mês ou fixo mensal
            (valor digitado para o Conservador, × fator do cenário), por saca (R$/saca × sacas previstas) ou % da receita (% × receita
            prevista).
          </>
        }
        calculo={[
          ...gruposPrev.map((g) => `${g.label}: ${R(g.totalPrevisto)}`),
          `Despesa prevista = ${R(plan.totais.despesaPrevista)}`,
          `Fator do cenário ${cen}: mercado interno × ${plan.fatorDespesas.interno.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} · externo × ${plan.fatorDespesas.externo.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} · demais grupos × ${plan.fatorDespesas.total.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`,
        ]}
        logica="Total de custos e despesas planejados no ano. Despesas digitadas crescem com o cenário; linhas por saca e % da receita acompanham sozinhas o volume e a receita."
      />
    ),
    resPrev: (
      <ExplicacaoSecoes
        origem="Receita prevista e despesa prevista do plano, no cenário exibido."
        calculo={[
          `Resultado previsto = ${R(plan.totais.receitaPrevista)} − ${R(plan.totais.despesaPrevista)} = ${R(plan.totais.resultadoPrevisto)}`,
          `Margem = ${plan.totais.receitaPrevista > 0 ? formatPercent((plan.totais.resultadoPrevisto / plan.totais.receitaPrevista) * 100, 1) : "-"} da receita`,
        ]}
        logica="Lucro (ou prejuízo) planejado para o ano antes de qualquer valor realizado."
      />
    ),
    resReal: (
      <ExplicacaoSecoes
        origem="Receita realizada (digitada no botão Volume e Receita) e despesas realizadas (digitadas no lápis de cada linha)."
        calculo={[
          `Receita realizada = ${R(plan.totais.receitaRealizada)}`,
          `Despesa realizada = ${R(plan.totais.despesaRealizada)}`,
          `Resultado realizado = ${R(plan.totais.receitaRealizada)} − ${R(plan.totais.despesaRealizada)} = ${R(plan.totais.resultadoRealizado)}`,
          `% = resultado ÷ receita realizada = ${formatPercent(resultadoRealizadoPercent, 1)}`,
        ]}
        logica="Lucro de fato até agora no ano do plano, para comparar com o resultado previsto."
      />
    ),
    volInt: (
      <ExplicacaoSecoes
        origem={<>Parte do volume base do mercado interno (volume base − volume externo, mês a mês) com o crescimento do mercado interno do cenário {cen}. {baseTexto}</>}
        calculo={[
          `Volume interno = ${sc(volBaseInt)} sc × (1 + ${P(crescI)}) = ${sc(volIntPrevisto)} sc`,
          ...linhasBase("Int", "sacas"),
          varTexto(`${sc(volIntPrevisto)}`, `${sc(anoAnterior?.volInt ?? 0)}`, varVolInt),
        ]}
        logica="Sacas que o plano prevê vender no mercado interno e como isso se compara ao ritmo real do mercado interno neste ano."
      />
    ),
    volExt: (
      <ExplicacaoSecoes
        origem={<>Volume externo mês a mês do plano com o crescimento do mercado externo do cenário {cen}. {baseTexto}</>}
        calculo={[
          `Volume externo = ${sc(volBaseExt)} sc × (1 + ${P(crescE)}) = ${sc(volExtPrevisto)} sc`,
          ...linhasBase("Ext", "sacas"),
          varTexto(`${sc(volExtPrevisto)}`, `${sc(anoAnterior?.volExt ?? 0)}`, varVolExt),
        ]}
        logica="Sacas que o plano prevê exportar e como isso se compara ao ritmo real das exportações neste ano."
      />
    ),
    recInt: (
      <ExplicacaoSecoes
        origem={<>Volume interno previsto × preço da saca do plano. {baseTexto}</>}
        calculo={[
          linhaPreco,
          `Receita interna = ${sc(volIntPrevisto)} sc × ${R(precoSacaPlano)} = ${R(recIntPrevisto)}`,
          ...linhasBase("Int", "receita"),
          varTexto(R(recIntPrevisto), R(anoAnterior?.recInt ?? 0), varRecInt),
        ]}
        logica="Faturamento planejado no mercado interno. O plano usa um preço único por saca para os dois mercados; a base usa o preço real de cada venda."
      />
    ),
    recExt: (
      <ExplicacaoSecoes
        origem={<>Volume externo previsto × preço da saca do plano. {baseTexto}</>}
        calculo={[
          linhaPreco,
          `Receita externa = ${sc(volExtPrevisto)} sc × ${R(precoSacaPlano)} = ${R(recExtPrevisto)}`,
          ...linhasBase("Ext", "receita"),
          varTexto(R(recExtPrevisto), R(anoAnterior?.recExt ?? 0), varRecExt),
        ]}
        logica="Faturamento planejado com exportação. O plano usa um preço único por saca para os dois mercados; a base usa o preço real de cada venda."
      />
    ),
    pe: (
      <ExplicacaoSecoes
        origem="Grupos de despesa do plano: custos fixos = Despesas Administrativas Fixas + Despesa com Pessoal + Empréstimo e Financiamento; custos variáveis = Custo Fornecedor + Despesas Mercado Interno + Despesas Mercado Externo + Despesas Administrativas Variáveis + Impostos. Investimentos ficam fora."
        calculo={[
          `Custos fixos = ${R(plan.pontoEquilibrio.custosFixos)}`,
          `% custo variável = custos variáveis ÷ receita prevista = ${P(plan.pontoEquilibrio.custosVariaveisPercent)}`,
          `Ponto de equilíbrio = ${R(plan.pontoEquilibrio.custosFixos)} ÷ (1 − ${P(plan.pontoEquilibrio.custosVariaveisPercent)}) = ${plan.pontoEquilibrio.valorReais !== null ? R(plan.pontoEquilibrio.valorReais) : "-"}`,
        ]}
        logica="Receita mínima no ano para não ter prejuízo (margem de contribuição). Cada real vendido sobra (1 − % variável) para pagar os custos fixos."
      />
    ),
    caixa: (meses: number, valor: number) => (
      <ExplicacaoSecoes
        origem="Despesa prevista total do plano, no cenário exibido."
        calculo={[
          `Média de despesa mensal = ${R(plan.totais.despesaPrevista)} ÷ 12 = ${R(plan.caixaSeguranca.mediaDespesaMensal)}`,
          `Caixa de segurança = ${R(plan.caixaSeguranca.mediaDespesaMensal)} × ${meses} meses = ${R(valor)}`,
        ]}
        logica={`Reserva de caixa para cobrir ${meses} meses de despesas sem nenhuma receita. Faixas usadas: 6 meses = bom, 12 = ótimo, 18 = excelente.`}
      />
    ),
  };

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
          explicacao={exp.volPrev}
          value={`${sc(volPrevisto)} sc`}
          icon={Package}
          tone="teal"
          trend={fmtVar(varVol)}
          trendPositive={(varVol ?? 0) >= 0}
          trendLabel={anoAnterior ? `vs ${sc(anoAnterior.volume)} sc em ${anoAnterior.rotulo}` : undefined}
        />
        <KpiCard
          label="Volume Realizado"
          explicacao={exp.volReal}
          value={`${sc(volRealizado)} sc`}
          icon={Package}
          tone="green"
          trendLabel={`Interno ${sc(volIntRealizado)} sc · Externo ${sc(volExtRealizado)} sc`}
        />
        <KpiCard
          label="Despesa Prevista por Saca"
          explicacao={exp.despSaca}
          value={despesaPorSaca !== null ? formatCurrencyPrecise(despesaPorSaca) : "-"}
          icon={TrendingDown}
          tone="soft"
          trendLabel={`Receita prevista por saca: ${receitaPorSaca > 0 ? formatCurrencyPrecise(receitaPorSaca) : "-"}`}
        />
        <KpiCard
          label="Ponto de Equilíbrio em Sacas"
          explicacao={exp.peSacas}
          value={peSacas !== null ? `${sc(peSacas)} sc` : "-"}
          icon={Ship}
          tone="teal"
          trendLabel="Sacas a vender para cobrir os custos fixos"
        />
        <KpiCard
          label={`Receita Prevista (${SCENARIO_LABELS[plan.scenario]})`}
          explicacao={exp.recPrev}
          value={formatCompactCurrency(plan.totais.receitaPrevista)}
          icon={TrendingUp}
          tone="teal"
          trend={fmtVar(varRec)}
          trendPositive={(varRec ?? 0) >= 0}
          trendLabel={anoAnterior ? `vs ${formatCompactCurrency(anoAnterior.receita)} em ${anoAnterior.rotulo}` : undefined}
        />
        <KpiCard
          label="Despesa Prevista"
          explicacao={exp.despPrev}
          value={formatCompactCurrency(plan.totais.despesaPrevista)}
          icon={TrendingDown}
          tone="soft"
        />
        <KpiCard
          label="Resultado Previsto"
          explicacao={exp.resPrev}
          value={formatCompactCurrency(plan.totais.resultadoPrevisto)}
          icon={Wallet}
          tone="green"
        />
        <KpiCard
          label="Resultado Realizado"
          explicacao={exp.resReal}
          value={`${formatCompactCurrency(plan.totais.resultadoRealizado)} (${formatPercent(resultadoRealizadoPercent, 1)})`}
          icon={PiggyBank}
          tone="teal"
        />
        <KpiCard
          label={`Volume Interno (${SCENARIO_LABELS[plan.scenario]})`}
          explicacao={exp.volInt}
          value={`${sc(volIntPrevisto)} sc`}
          icon={Package}
          tone="teal"
          trend={fmtVar(varVolInt)}
          trendPositive={(varVolInt ?? 0) >= 0}
          trendLabel={anoAnterior ? `vs ${sc(anoAnterior.volInt)} sc em ${anoAnterior.rotulo.slice(0, 4)}` : undefined}
        />
        <KpiCard
          label={`Volume Externo (${SCENARIO_LABELS[plan.scenario]})`}
          explicacao={exp.volExt}
          value={`${sc(volExtPrevisto)} sc`}
          icon={Package}
          tone="teal"
          trend={fmtVar(varVolExt)}
          trendPositive={(varVolExt ?? 0) >= 0}
          trendLabel={anoAnterior ? `vs ${sc(anoAnterior.volExt)} sc em ${anoAnterior.rotulo.slice(0, 4)}` : undefined}
        />
        <KpiCard
          label={`Receita Interna (${SCENARIO_LABELS[plan.scenario]})`}
          explicacao={exp.recInt}
          value={formatCompactCurrency(recIntPrevisto)}
          icon={TrendingUp}
          tone="teal"
          trend={fmtVar(varRecInt)}
          trendPositive={(varRecInt ?? 0) >= 0}
          trendLabel={anoAnterior ? `vs ${formatCompactCurrency(anoAnterior.recInt)} em ${anoAnterior.rotulo.slice(0, 4)}` : undefined}
        />
        <KpiCard
          label={`Receita Externa (${SCENARIO_LABELS[plan.scenario]})`}
          explicacao={exp.recExt}
          value={formatCompactCurrency(recExtPrevisto)}
          icon={TrendingUp}
          tone="teal"
          trend={fmtVar(varRecExt)}
          trendPositive={(varRecExt ?? 0) >= 0}
          trendLabel={anoAnterior ? `vs ${formatCompactCurrency(anoAnterior.recExt)} em ${anoAnterior.rotulo.slice(0, 4)}` : undefined}
        />
        <KpiCard
          label="Ponto de Equilíbrio"
          explicacao={exp.pe}
          value={plan.pontoEquilibrio.valorReais !== null ? formatCompactCurrency(plan.pontoEquilibrio.valorReais) : "-"}
          icon={Ship}
          tone="soft"
        />
        <KpiCard
          label="Caixa de Segurança (Bom / 6 meses)"
          explicacao={exp.caixa(6, plan.caixaSeguranca.bom)}
          value={formatCompactCurrency(plan.caixaSeguranca.bom)}
          icon={PiggyBank}
          tone="green"
        />
        <KpiCard
          label="Caixa de Segurança (Ótimo / 12 meses)"
          explicacao={exp.caixa(12, plan.caixaSeguranca.otimo)}
          value={formatCompactCurrency(plan.caixaSeguranca.otimo)}
          icon={PiggyBank}
          tone="teal"
        />
        <KpiCard
          label="Caixa de Segurança (Excelente / 18 meses)"
          explicacao={exp.caixa(18, plan.caixaSeguranca.excelente)}
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
                  onChange={(e) => setCustoForm({ ...custoForm, tipo: e.target.value as TipoCusto })}
                >
                  <option value="FIXO">Mês a mês</option>
                  <option value="MENSAL">Fixo mensal</option>
                  <option value="POR_SACA">Por saca</option>
                  <option value="PERCENTUAL">% da receita</option>
                </Select>
              </div>
              {custoForm.tipo === "PERCENTUAL" && (
                <>
                  <div>
                    <Label>Percentual (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex.: 1,5"
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
                      <option value="TOTAL">Receita total</option>
                      <option value="INTERNO">Receita mercado interno</option>
                      <option value="EXTERNO">Receita mercado externo</option>
                    </Select>
                  </div>
                  <p className="text-[11px] text-muted sm:col-span-3">
                    Previsto de cada mês = percentual × receita prevista do mês no cenário {SCENARIO_LABELS[plan.scenario]}. Atualiza sozinho
                    quando o volume, o preço ou o cenário do plano mudam. O realizado continua digitado.
                  </p>
                </>
              )}
              {custoForm.tipo === "MENSAL" && (
                <>
                  <div>
                    <Label>Valor por mês (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex.: 3.500,00"
                      value={custoForm.valor}
                      onChange={(e) => setCustoForm({ ...custoForm, valor: e.target.value })}
                    />
                  </div>
                  <p className="text-[11px] text-muted sm:col-span-3">
                    O mesmo valor previsto nos 12 meses. O realizado continua digitado mês a mês.
                  </p>
                </>
              )}
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
              {(custoForm.tipo === "FIXO" || custoForm.tipo === "MENSAL") && editingLine && (
                <p className="text-[11px] text-muted sm:col-span-3">
                  Digite o previsto do cenário Conservador. Nos outros cenários ele cresce junto com o volume:{" "}
                  {editingLine.group === "DESPESA_MERCADO_INTERNO"
                    ? "% do mercado interno"
                    : editingLine.group === "DESPESA_MERCADO_EXTERNO"
                    ? "% do mercado externo"
                    : "crescimento do volume total"}
                  {plan.scenario !== "CONSERVADOR" &&
                    ` (no cenário ${SCENARIO_LABELS[plan.scenario]}: x ${(editingLine.group === "DESPESA_MERCADO_INTERNO"
                      ? plan.fatorDespesas.interno
                      : editingLine.group === "DESPESA_MERCADO_EXTERNO"
                      ? plan.fatorDespesas.externo
                      : plan.fatorDespesas.total
                    ).toLocaleString("pt-BR", { maximumFractionDigits: 4 })})`}
                  .
                </p>
              )}
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
              <table className="w-full whitespace-nowrap text-xs">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-2 py-2 font-medium">Mês</th>
                    {custoForm.tipo === "POR_SACA" && <th className="px-2 py-2 font-medium">Sacas</th>}
                    {custoForm.tipo === "PERCENTUAL" && <th className="px-2 py-2 font-medium">Receita prevista (R$)</th>}
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
                      {custoForm.tipo === "PERCENTUAL" && (
                        <td className="px-2 py-1.5 tabular-nums text-muted">
                          {receitaDoMes(idx, custoForm.base).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          className="h-8 w-32"
                          disabled={previstoCalculado}
                          value={previstoCalculado ? String(previstoPorSaca(idx)) : row.previsto}
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
                  <th className="px-2 py-2 font-medium">Tipo de custo</th>
                  <th className="px-2 py-2 font-medium">Valor (R$)</th>
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
                      <CustoTipoCelulas line={line} />
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

type TipoCusto = "FIXO" | "MENSAL" | "POR_SACA" | "PERCENTUAL";
type BaseVolume = "TOTAL" | "INTERNO" | "EXTERNO";

// Tipo de custo direto na lista: mes a mes (digitado no lapis), fixo mensal
// (mesmo valor nos 12 meses) ou por saca (R$/saca x sacas do mes no cenario).
// Grava ao trocar o tipo ou a base e ao sair do campo de valor (ou Enter).
function CustoTipoCelulas({ line }: { line: BudgetLineData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tipo = line.tipoCusto;
  const valorDoTipo = (t: TipoCusto) =>
    t === "POR_SACA" ? line.valorPorSaca : t === "MENSAL" ? line.valorMensal : t === "PERCENTUAL" ? line.valorPercentual : 0;
  const valorAtual = valorDoTipo(tipo);
  const [valor, setValor] = useState(valorAtual ? String(valorAtual) : "");

  function salvar(novoTipo: TipoCusto, novoValor: number, base: BaseVolume = line.baseVolume) {
    startTransition(async () => {
      await updateBudgetLineCusto(line.id, {
        tipoCusto: novoTipo,
        valorPorSaca: novoTipo === "POR_SACA" ? novoValor : line.valorPorSaca,
        valorMensal: novoTipo === "MENSAL" ? novoValor : line.valorMensal,
        valorPercentual: novoTipo === "PERCENTUAL" ? novoValor : line.valorPercentual,
        baseVolume: base,
      });
      router.refresh();
    });
  }

  function trocarTipo(novoTipo: TipoCusto) {
    // Ao trocar, aproveita o ultimo valor salvo daquele tipo.
    const v = valorDoTipo(novoTipo);
    setValor(v ? String(v) : "");
    salvar(novoTipo, v);
  }

  function salvarValor() {
    const v = Number(valor.replace(",", ".")) || 0;
    if (v === valorAtual) return;
    salvar(tipo, v);
  }

  return (
    <>
      <td className="px-2 py-2">
        <Select
          aria-label={`${line.name}: tipo de custo`}
          className="h-8 w-36"
          value={tipo}
          disabled={isPending}
          onChange={(e) => trocarTipo(e.target.value as TipoCusto)}
        >
          <option value="FIXO">Mês a mês</option>
          <option value="MENSAL">Fixo mensal</option>
          <option value="POR_SACA">Por saca</option>
          <option value="PERCENTUAL">% da receita</option>
        </Select>
      </td>
      <td className="px-2 py-2">
        {tipo === "FIXO" ? (
          <span className="text-[11px] text-muted">no lápis</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              className="h-8 w-28"
              value={valor}
              disabled={isPending}
              onChange={(e) => setValor(e.target.value)}
              onBlur={salvarValor}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
            <span className="text-[11px] text-muted">{tipo === "MENSAL" ? "/mês" : tipo === "PERCENTUAL" ? "%" : "/sc"}</span>
          </div>
        )}
      </td>
      <td className="px-2 py-2">
        {tipo === "POR_SACA" || tipo === "PERCENTUAL" ? (
          <Select
            className="h-8 w-40"
            value={line.baseVolume}
            disabled={isPending}
            onChange={(e) => salvar(tipo, Number(valor.replace(",", ".")) || 0, e.target.value as BaseVolume)}
          >
            <option value="TOTAL">{tipo === "PERCENTUAL" ? "Receita total" : "Volume total"}</option>
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
