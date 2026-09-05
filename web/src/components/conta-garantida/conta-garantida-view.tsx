"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PieChartCard } from "@/components/charts/pie-chart-card";
import { formatCompactCurrency, formatCurrency, formatMonthLabel, formatPercent } from "@/lib/format";
import { ContaGarantidaRow, ContaGarantidaUsoRow } from "@/lib/data";
import {
  createContaGarantida,
  deleteContaGarantida,
  updateContaGarantida,
  createContaGarantidaUso,
  deleteContaGarantidaUso,
  updateContaGarantidaUso,
  ContaGarantidaFormInput,
  ContaGarantidaUsoFormInput,
} from "@/app/(dashboard)/conta-garantida/actions";
import { NovoBanco } from "@/components/bancos/novo-banco";
import { Plus, Pencil, Trash2, Wallet, PiggyBank, TrendingUp, ChevronDown, ChevronRight, Percent } from "lucide-react";

type Bank = { id: string; name: string; color: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(defaultBankId: string) {
  return {
    bankId: defaultBankId,
    limiteContratado: "",
    taxaJurosPercent: "",
    observacao: "",
  };
}

function formFromConta(conta: ContaGarantidaRow) {
  return {
    bankId: conta.bankId,
    limiteContratado: String(conta.limiteContratado),
    taxaJurosPercent: String(conta.taxaJurosPercent),
    observacao: conta.observacao ?? "",
  };
}

function emptyUsoForm(contaGarantidaId: string) {
  return {
    contaGarantidaId,
    valorUtilizado: "",
    dataInicio: todayISO(),
    dataFim: "",
    observacao: "",
  };
}

function formFromUso(contaGarantidaId: string, uso: ContaGarantidaUsoRow) {
  return {
    contaGarantidaId,
    valorUtilizado: String(uso.valorUtilizado),
    dataInicio: uso.dataInicio,
    dataFim: uso.dataFim ?? "",
    observacao: uso.observacao ?? "",
  };
}

type EvolucaoSerie = { key: string; name: string; color: string };
type Evolucao = { data: Record<string, unknown>[]; series: EvolucaoSerie[] };

function parseISODateLocal(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthKeyLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function firstOfMonthLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonthLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function daysBetweenLocal(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function lastDayOfMonth(year: string, month: string) {
  return new Date(Number(year), Number(month), 0).getDate();
}

// Decompoe o custo total ja calculado de cada utilizacao (juros/iof, lineares
// nos dias de uso) em fatias por mes calendario, proporcional aos dias de uso
// dentro de cada mes. O IOF adicional e um encargo unico na utilizacao, entao
// entra inteiro no mes de inicio dela.
function custoMensalDeUsos(contas: { usos: ContaGarantidaUsoRow[] }[]) {
  const porMes = new Map<string, { juros: number; iof: number; iofAdicional: number }>();
  const hoje = new Date();

  for (const c of contas) {
    for (const u of c.usos) {
      if (u.dias <= 0) continue;
      const inicio = parseISODateLocal(u.dataInicio);
      const fim = u.dataFim ? parseISODateLocal(u.dataFim) : hoje;
      if (fim < inicio) continue;

      let diasAcumulados = 0;
      let primeiroMes = true;
      let cursor = firstOfMonthLocal(inicio);
      while (cursor <= fim) {
        const fimMes = endOfMonthLocal(cursor);
        const ateData = fimMes < fim ? fimMes : fim;
        const totalAteFim = daysBetweenLocal(inicio, ateData);
        const diasNoMes = Math.max(0, totalAteFim - diasAcumulados);
        diasAcumulados = totalAteFim;

        const key = monthKeyLocal(cursor);
        const cur = porMes.get(key) ?? { juros: 0, iof: 0, iofAdicional: 0 };
        const fracao = diasNoMes / u.dias;
        cur.juros += u.juros * fracao;
        cur.iof += u.iof * fracao;
        if (primeiroMes) {
          cur.iofAdicional += u.iofAdicional;
          primeiroMes = false;
        }
        porMes.set(key, cur);

        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      }
    }
  }

  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month: formatMonthLabel(month),
      juros: Number(v.juros.toFixed(2)),
      iof: Number(v.iof.toFixed(2)),
      iofAdicional: Number(v.iofAdicional.toFixed(2)),
    }));
}

const statusUsoOptions = [
  { value: "todos", label: "Todas as utilizações" },
  { value: "aberto", label: "Em aberto" },
  { value: "encerrado", label: "Encerradas" },
] as const;

export function ContaGarantidaView({
  banks,
  initialContas,
  evolucao,
}: {
  banks: Bank[];
  initialContas: ContaGarantidaRow[];
  evolucao: Evolucao;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [bankFilter, setBankFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<(typeof statusUsoOptions)[number]["value"]>("todos");
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const filtersActive = bankFilter !== "todos" || statusFilter !== "todos" || !!yearFilter;

  const anosDisponiveis = useMemo(
    () =>
      Array.from(new Set(initialContas.flatMap((c) => c.usos.map((u) => u.dataInicio.slice(0, 4))))).sort(),
    [initialContas]
  );

  // Ano/mes viram um intervalo de data de inicio (dataInicio da utilizacao) -
  // so ano: o ano inteiro; ano + mes: so aquele mes.
  const fromFilter = yearFilter ? `${yearFilter}-${monthFilter || "01"}-01` : "";
  const toFilter = yearFilter
    ? monthFilter
      ? `${yearFilter}-${monthFilter}-${String(lastDayOfMonth(yearFilter, monthFilter)).padStart(2, "0")}`
      : `${yearFilter}-12-31`
    : "";

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(banks[0]?.id ?? ""));

  const [openUso, setOpenUso] = useState(false);
  const [editingUsoId, setEditingUsoId] = useState<string | null>(null);
  const [errorUso, setErrorUso] = useState<string | null>(null);
  const [formUso, setFormUso] = useState(emptyUsoForm(""));

  // Banco filtra quais contas aparecem (KPIs, tabela e graficos). Status e
  // periodo filtram quais utilizacoes de cada conta contam - valorUtilizado e
  // valorDisponivel continuam refletindo o saldo real em aberto hoje, so o
  // custo (juros/IOF) do periodo e recalculado com base nas utilizacoes
  // filtradas.
  const filteredContas = useMemo(() => {
    return initialContas
      .filter((c) => bankFilter === "todos" || c.bankId === bankFilter)
      .map((c) => {
        const usos = c.usos.filter((u) => {
          if (statusFilter === "aberto" && !u.emAberto) return false;
          if (statusFilter === "encerrado" && u.emAberto) return false;
          if (fromFilter && u.dataInicio < fromFilter) return false;
          if (toFilter && u.dataInicio > toFilter) return false;
          return true;
        });
        const jurosPeriodo = Number(usos.reduce((s, u) => s + u.juros, 0).toFixed(2));
        const iofPeriodo = Number(usos.reduce((s, u) => s + u.iof, 0).toFixed(2));
        const iofAdicionalPeriodo = Number(usos.reduce((s, u) => s + u.iofAdicional, 0).toFixed(2));
        const valorAPagarPeriodo = Number(usos.reduce((s, u) => s + u.valorAPagar, 0).toFixed(2));
        return { ...c, usos, jurosPeriodo, iofPeriodo, iofAdicionalPeriodo, valorAPagarPeriodo };
      });
  }, [initialContas, bankFilter, statusFilter, fromFilter, toFilter]);

  const totais = useMemo(() => {
    return filteredContas.reduce(
      (acc, c) => ({
        limite: acc.limite + c.limiteContratado,
        utilizado: acc.utilizado + c.valorUtilizado,
        disponivel: acc.disponivel + c.valorDisponivel,
        aPagar: acc.aPagar + c.valorAPagarPeriodo,
      }),
      { limite: 0, utilizado: 0, disponivel: 0, aPagar: 0 }
    );
  }, [filteredContas]);

  // Media simples mistura contas com valor utilizado pequeno e grande no mesmo
  // peso; a taxa media ponderada pesa cada conta pelo valor efetivamente
  // utilizado (e o que de fato acumula juros), a mesma convencao de
  // weightedAvg usada para o custo medio da carteira de emprestimos.
  const taxaMediaPonderada = useMemo(() => {
    const pesoTotal = filteredContas.reduce((s, c) => s + c.valorUtilizado, 0);
    if (pesoTotal <= 0) return 0;
    const soma = filteredContas.reduce((s, c) => s + c.taxaJurosPercent * c.valorUtilizado, 0);
    return Number((soma / pesoTotal).toFixed(2));
  }, [filteredContas]);

  const bankChartData = useMemo(
    () =>
      filteredContas.map((c) => ({
        banco: c.bankName,
        limiteContratado: c.limiteContratado,
        valorUtilizado: c.valorUtilizado,
      })),
    [filteredContas]
  );

  const custoChartData = useMemo(() => {
    const juros = filteredContas.reduce((s, c) => s + c.jurosPeriodo, 0);
    const iof = filteredContas.reduce((s, c) => s + c.iofPeriodo, 0);
    const iofAdicional = filteredContas.reduce((s, c) => s + c.iofAdicionalPeriodo, 0);
    return [
      { name: "Juros", value: Number(juros.toFixed(2)), color: "#1c8388" },
      { name: "IOF", value: Number(iof.toFixed(2)), color: "#d68c2b" },
      { name: "IOF Adicional", value: Number(iofAdicional.toFixed(2)), color: "#f04438" },
    ].filter((d) => d.value > 0);
  }, [filteredContas]);

  const custoMensalData = useMemo(() => custoMensalDeUsos(filteredContas), [filteredContas]);

  const evolucaoSeries = useMemo(
    () => (bankFilter === "todos" ? evolucao.series : evolucao.series.filter((s) => s.key === bankFilter)),
    [evolucao.series, bankFilter]
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(banks[0]?.id ?? ""));
    setError(null);
    setOpen(true);
  }

  function openEdit(conta: ContaGarantidaRow) {
    setEditingId(conta.id);
    setForm(formFromConta(conta));
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.bankId) {
      setError("Selecione o banco.");
      return;
    }
    if (!(Number(form.limiteContratado) > 0)) {
      setError("Informe o limite contratado, maior que zero.");
      return;
    }
    setError(null);
    const payload: ContaGarantidaFormInput = {
      bankId: form.bankId,
      limiteContratado: Number(form.limiteContratado) || 0,
      taxaJurosPercent: Number(form.taxaJurosPercent) || 0,
      observacao: form.observacao.trim(),
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateContaGarantida(editingId, payload);
        } else {
          await createContaGarantida(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel salvar a conta garantida.");
      }
    });
  }

  function handleDelete(conta: ContaGarantidaRow) {
    if (
      !window.confirm(
        `Excluir a conta garantida do ${conta.bankName}? Todas as utilizacoes registradas tambem serao excluidas. Esta acao nao pode ser desfeita.`
      )
    )
      return;
    startTransition(async () => {
      await deleteContaGarantida(conta.id);
      router.refresh();
    });
  }

  function openCreateUso(contaGarantidaId: string) {
    setEditingUsoId(null);
    setFormUso(emptyUsoForm(contaGarantidaId));
    setErrorUso(null);
    setOpenUso(true);
  }

  function openEditUso(contaGarantidaId: string, uso: ContaGarantidaUsoRow) {
    setEditingUsoId(uso.id);
    setFormUso(formFromUso(contaGarantidaId, uso));
    setErrorUso(null);
    setOpenUso(true);
  }

  function handleSaveUso() {
    if (!(Number(formUso.valorUtilizado) > 0)) {
      setErrorUso("Informe o valor utilizado, maior que zero.");
      return;
    }
    if (!formUso.dataInicio) {
      setErrorUso("Informe a data de inicio da utilizacao.");
      return;
    }
    if (formUso.dataFim && formUso.dataFim < formUso.dataInicio) {
      setErrorUso("A data de fim nao pode ser anterior a data de inicio.");
      return;
    }
    setErrorUso(null);
    const payload: ContaGarantidaUsoFormInput = {
      contaGarantidaId: formUso.contaGarantidaId,
      valorUtilizado: Number(formUso.valorUtilizado) || 0,
      dataInicio: formUso.dataInicio,
      dataFim: formUso.dataFim,
      observacao: formUso.observacao.trim(),
    };
    startTransition(async () => {
      try {
        if (editingUsoId) {
          await updateContaGarantidaUso(editingUsoId, payload);
        } else {
          await createContaGarantidaUso(payload);
        }
        setOpenUso(false);
        router.refresh();
      } catch {
        setErrorUso("Nao foi possivel salvar a utilizacao.");
      }
    });
  }

  function handleDeleteUso(uso: ContaGarantidaUsoRow) {
    if (!window.confirm("Excluir esta utilizacao? Esta acao nao pode ser desfeita.")) return;
    startTransition(async () => {
      await deleteContaGarantidaUso(uso.id);
      router.refresh();
    });
  }

  function clearFilters() {
    setBankFilter("todos");
    setStatusFilter("todos");
    setYearFilter("");
    setMonthFilter("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-3">
        <div>
          <Label>Ano</Label>
          <Select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setMonthFilter("");
            }}
            className="w-auto"
          >
            <option value="">Todos os anos</option>
            {anosDisponiveis.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Mês</Label>
          <Select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            disabled={!yearFilter}
            className="w-auto"
          >
            <option value="">Todos os meses</option>
            {MESES.map((label, i) => {
              const value = String(i + 1).padStart(2, "0");
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Limite Contratado Total"
          value={formatCompactCurrency(totais.limite)}
          icon={Wallet}
          tone="teal"
        />
        <KpiCard
          label="Valor Utilizado Total"
          value={formatCompactCurrency(totais.utilizado)}
          icon={TrendingUp}
          tone="soft"
        />
        <KpiCard
          label="Valor Disponível Total"
          value={formatCompactCurrency(totais.disponivel)}
          icon={PiggyBank}
          tone="green"
        />
        <KpiCard
          label="Valor a Pagar no Período"
          value={formatCompactCurrency(totais.aPagar)}
          icon={Wallet}
          tone="teal"
        />
        <KpiCard
          label="Taxa Média Ponderada"
          value={`${formatPercent(taxaMediaPonderada)} a.m.`}
          icon={Percent}
          tone="soft"
        />
      </div>

      {initialContas.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LineChartCard
                title="Evolução do valor utilizado"
                data={evolucao.data}
                xKey="month"
                series={evolucaoSeries}
                valueFormat="currency"
              />
            </div>
            <PieChartCard title="Composição do custo (juros x IOF)" data={custoChartData} />
          </div>

          <BarChartCard
            title="Limite Contratado x Valor Utilizado por Banco"
            data={bankChartData}
            xKey="banco"
            series={[
              { key: "limiteContratado", name: "Limite Contratado", color: "#a8c5c8" },
              { key: "valorUtilizado", name: "Valor Utilizado", color: "#1c8388" },
            ]}
            valueFormat="currency"
          />

          {custoMensalData.length > 0 && (
            <BarChartCard
              title="Custo Mensal (Juros x IOF x IOF Adicional)"
              data={custoMensalData}
              xKey="month"
              stacked
              series={[
                { key: "juros", name: "Juros", color: "#1c8388" },
                { key: "iof", name: "IOF", color: "#d68c2b" },
                { key: "iofAdicional", name: "IOF Adicional", color: "#f04438" },
              ]}
              valueFormat="currency"
            />
          )}
        </>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className="w-auto">
            <option value="todos">Todos os bancos</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as (typeof statusUsoOptions)[number]["value"])}
            className="w-auto"
          >
            {statusUsoOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {filtersActive && (
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nova Conta Garantida
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar conta garantida" : "Cadastrar conta garantida"}>
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Banco</Label>
                  <Select value={form.bankId} onChange={(e) => setForm({ ...form, bankId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <NovoBanco compact />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Limite Contratado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.limiteContratado}
                    onChange={(e) => setForm({ ...form, limiteContratado: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Taxa de Juros (% a.m.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxaJurosPercent}
                    onChange={(e) => setForm({ ...form, taxaJurosPercent: e.target.value })}
                  />
                </div>
              </div>

              <p className="text-xs text-muted">
                O limite aprovado por esse banco. Cada saque/utilizacao do limite (com seu proprio periodo de uso)
                e registrado separadamente depois de salvar, na lista de utilizacoes da conta.
              </p>

              <div>
                <Label>Observação</Label>
                <Input
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  placeholder="Opcional"
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="max-h-[70vh] overflow-auto p-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium" />
                <th className="px-4 py-3 font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Limite Contratado</th>
                <th className="px-4 py-3 font-medium">Valor Utilizado</th>
                <th className="px-4 py-3 font-medium">Valor Disponível</th>
                <th className="px-4 py-3 font-medium">Taxa</th>
                <th className="px-4 py-3 font-medium">Valor a Pagar (todas utilizações)</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filteredContas.map((c) => {
                const isExpanded = expandedId === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className="border-b border-border last:border-0 hover:bg-border/20">
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="rounded-md p-1 text-muted hover:bg-border/60 hover:text-foreground"
                          title={isExpanded ? "Recolher utilizações" : "Ver utilizações"}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{c.bankName}</td>
                      <td className="px-4 py-2.5">{formatCurrency(c.limiteContratado)}</td>
                      <td className="px-4 py-2.5">{formatCurrency(c.valorUtilizado)}</td>
                      <td className="px-4 py-2.5">{formatCurrency(c.valorDisponivel)}</td>
                      <td className="px-4 py-2.5">{formatPercent(c.taxaJurosPercent)} a.m.</td>
                      <td className="px-4 py-2.5 font-medium">{formatCurrency(c.valorAPagarPeriodo)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openCreateUso(c.id)}
                            className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                            title="Nova utilização"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border last:border-0 bg-border/10">
                        <td />
                        <td colSpan={7} className="px-4 py-3">
                          {c.usos.length === 0 ? (
                            <p className="py-2 text-xs text-muted">
                              {filtersActive
                                ? "Nenhuma utilização encontrada com os filtros atuais."
                                : "Nenhuma utilização registrada ainda para este banco."}
                            </p>
                          ) : (
                            <table className="w-full whitespace-nowrap text-xs">
                              <thead>
                                <tr className="border-b border-border text-left text-muted">
                                  <th className="px-2 py-2 font-medium">Início</th>
                                  <th className="px-2 py-2 font-medium">Fim</th>
                                  <th className="px-2 py-2 font-medium">Valor Utilizado</th>
                                  <th className="px-2 py-2 font-medium">Dias</th>
                                  <th className="px-2 py-2 font-medium">Juros</th>
                                  <th className="px-2 py-2 font-medium">IOF</th>
                                  <th className="px-2 py-2 font-medium">IOF Adicional</th>
                                  <th className="px-2 py-2 font-medium">A Pagar</th>
                                  <th className="px-2 py-2 font-medium">Observação</th>
                                  <th className="px-2 py-2 font-medium" />
                                </tr>
                              </thead>
                              <tbody>
                                {c.usos.map((u) => (
                                  <tr key={u.id} className="border-b border-border/60 last:border-0">
                                    <td className="px-2 py-2">{u.dataInicio.split("-").reverse().join("/")}</td>
                                    <td className="px-2 py-2">
                                      {u.dataFim ? (
                                        u.dataFim.split("-").reverse().join("/")
                                      ) : (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                                          Em aberto
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2">{formatCurrency(u.valorUtilizado)}</td>
                                    <td className="px-2 py-2">{u.dias}</td>
                                    <td className="px-2 py-2">{formatCurrency(u.juros)}</td>
                                    <td className="px-2 py-2">{formatCurrency(u.iof)}</td>
                                    <td className="px-2 py-2">{formatCurrency(u.iofAdicional)}</td>
                                    <td className="px-2 py-2 font-medium">{formatCurrency(u.valorAPagar)}</td>
                                    <td className="px-2 py-2 text-muted">{u.observacao ?? "-"}</td>
                                    <td className="px-2 py-2">
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => openEditUso(c.id, u)}
                                          className="rounded-md p-1 text-muted hover:bg-border/60 hover:text-foreground"
                                          title="Editar"
                                        >
                                          <Pencil size={12} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteUso(u)}
                                          className="rounded-md p-1 text-muted hover:bg-danger/10 hover:text-danger"
                                          title="Excluir"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <div className="mt-2">
                            <Button variant="outline" size="sm" onClick={() => openCreateUso(c.id)}>
                              <Plus size={14} />
                              Nova utilização
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filteredContas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    {initialContas.length === 0
                      ? "Nenhuma conta garantida cadastrada ainda."
                      : "Nenhuma conta garantida encontrada com os filtros atuais."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={openUso} onOpenChange={setOpenUso}>
        <DialogContent title={editingUsoId ? "Editar utilização" : "Nova utilização"}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={formUso.dataInicio}
                  onChange={(e) => setFormUso({ ...formUso, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={formUso.dataFim}
                  onChange={(e) => setFormUso({ ...formUso, dataFim: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted">Deixe em branco se o valor ainda estiver em uso</p>
              </div>
            </div>

            <div>
              <Label>Valor Utilizado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formUso.valorUtilizado}
                onChange={(e) => setFormUso({ ...formUso, valorUtilizado: e.target.value })}
              />
            </div>

            <p className="text-xs text-muted">
              Juros e IOF calculados automaticamente com base nos dias entre início e fim (ou hoje, se em aberto):
              taxa da conta a.m. proporcional aos dias + IOF de 0,0082% ao dia + 0,38% fixo (regra Bacen para PJ).
            </p>

            <div>
              <Label>Observação</Label>
              <Input
                value={formUso.observacao}
                onChange={(e) => setFormUso({ ...formUso, observacao: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            {errorUso && <p className="text-sm text-danger">{errorUso}</p>}
            <Button className="w-full" onClick={handleSaveUso} disabled={isPending}>
              {isPending ? "Salvando..." : editingUsoId ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
