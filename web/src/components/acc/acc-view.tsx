"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import {
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyPrecise,
  formatDate,
  formatPercent,
} from "@/lib/format";
import { AccRow } from "@/lib/data";
import { cn } from "@/lib/utils";
import { createAcc, deleteAcc, updateAcc, addAccBaixa, updateAccBaixa, deleteAccBaixa } from "@/app/(dashboard)/acc/actions";
import { calcBaixaJuros } from "@/lib/acc-calc";
import { NovoBanco } from "@/components/bancos/novo-banco";
import { Plus, Pencil, Trash2, Layers, Check, X, Printer } from "lucide-react";

type Bank = { id: string; name: string; color: string };
type StatusValue = "EM_ABERTO" | "LIQUIDADO" | "EM_ATRASO";

const statusVariant: Record<string, "success" | "danger" | "warning"> = {
  EM_ABERTO: "warning",
  LIQUIDADO: "success",
  EM_ATRASO: "danger",
};

const statusLabels: Record<string, string> = {
  EM_ABERTO: "Em aberto",
  LIQUIDADO: "Liquidado",
  EM_ATRASO: "Em atraso",
};

function annualToMonthly(annualPercent: number) {
  if (!annualPercent) return 0;
  return (Math.pow(1 + annualPercent / 100, 1 / 12) - 1) * 100;
}

function emptyForm(defaultBankId: string) {
  return {
    bankId: defaultBankId,
    contractNumber: "",
    contractedValueForeign: "",
    spotRate: "",
    closingRate: "",
    interestRateAnnual: "",
    contractDate: new Date().toISOString().slice(0, 10),
    vencimento: "",
    dataQuitacao: "",
    exchangeVariationValue: "",
    status: "EM_ABERTO" as StatusValue,
    hasInsurance: false,
    insuranceCost: "",
    otherCosts: "",
    iof: "",
    bankFees: "",
  };
}

function formFromRow(acc: AccRow) {
  return {
    bankId: acc.bankId,
    contractNumber: acc.accNumber,
    contractedValueForeign: String(acc.contractedValueForeign),
    spotRate: String(acc.spotRate),
    closingRate: String(acc.closingRate),
    interestRateAnnual: String(acc.interestRate),
    contractDate: acc.contractDate,
    vencimento: acc.settlementDate,
    dataQuitacao: acc.dataQuitacao ?? "",
    exchangeVariationValue: String(acc.exchangeVariationValue),
    status: acc.status as StatusValue,
    hasInsurance: acc.hasInsurance,
    insuranceCost: String(acc.insuranceCost),
    otherCosts: String(acc.otherCosts),
    iof: String(acc.iof),
    bankFees: String(acc.bankFees),
  };
}

export function AccView({ banks, accOperations }: { banks: Bank[]; accOperations: AccRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bankFilter, setBankFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [yearFilter, setYearFilter] = useState("todos");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(banks[0]?.id ?? ""));

  const [baixasAccId, setBaixasAccId] = useState<string | null>(null);
  const [editingBaixaId, setEditingBaixaId] = useState<string | null>(null);
  const [baixaDraft, setBaixaDraft] = useState({ valorUSD: "", dataQuitacao: "", closingRate: "" });
  const [novaBaixa, setNovaBaixa] = useState({ valorUSD: "", dataQuitacao: "", closingRate: "" });
  const [baixaError, setBaixaError] = useState<string | null>(null);

  const baixasAcc = useMemo(
    () => accOperations.find((a) => a.id === baixasAccId) ?? null,
    [accOperations, baixasAccId]
  );

  const novaBaixaPreview = useMemo(() => {
    if (!baixasAcc || !novaBaixa.dataQuitacao || !(Number(novaBaixa.valorUSD) > 0)) return null;
    return calcBaixaJuros(Number(novaBaixa.valorUSD), baixasAcc.interestRate, baixasAcc.contractDate, novaBaixa.dataQuitacao);
  }, [baixasAcc, novaBaixa]);

  function openBaixas(acc: AccRow) {
    setBaixasAccId(acc.id);
    setEditingBaixaId(null);
    setBaixaError(null);
    setNovaBaixa({ valorUSD: "", dataQuitacao: "", closingRate: String(acc.closingRate) });
  }

  function handleAddBaixa() {
    if (!baixasAccId) return;
    if (!novaBaixa.dataQuitacao || !(Number(novaBaixa.valorUSD) > 0) || !(Number(novaBaixa.closingRate) > 0)) {
      setBaixaError("Informe valor (USD), data e câmbio da baixa.");
      return;
    }
    setBaixaError(null);
    startTransition(async () => {
      await addAccBaixa(baixasAccId, {
        valorUSD: Number(novaBaixa.valorUSD),
        dataQuitacao: novaBaixa.dataQuitacao,
        closingRate: Number(novaBaixa.closingRate),
      });
      setNovaBaixa({ valorUSD: "", dataQuitacao: "", closingRate: novaBaixa.closingRate });
      router.refresh();
    });
  }

  function startEditBaixa(baixa: { id: string; valorUSD: number; dataQuitacao: string; closingRate: number }) {
    setEditingBaixaId(baixa.id);
    setBaixaDraft({
      valorUSD: String(baixa.valorUSD),
      dataQuitacao: baixa.dataQuitacao,
      closingRate: String(baixa.closingRate),
    });
  }

  function handleSaveBaixa(baixaId: string) {
    if (!baixaDraft.dataQuitacao || !(Number(baixaDraft.valorUSD) > 0) || !(Number(baixaDraft.closingRate) > 0)) return;
    startTransition(async () => {
      await updateAccBaixa(baixaId, {
        valorUSD: Number(baixaDraft.valorUSD),
        dataQuitacao: baixaDraft.dataQuitacao,
        closingRate: Number(baixaDraft.closingRate),
      });
      setEditingBaixaId(null);
      router.refresh();
    });
  }

  function handleDeleteBaixa(baixaId: string) {
    startTransition(async () => {
      await deleteAccBaixa(baixaId);
      router.refresh();
    });
  }

  const years = useMemo(
    () => Array.from(new Set(accOperations.map((a) => a.contractDate.slice(0, 4)))).sort(),
    [accOperations]
  );

  function applyYearFilter(year: string) {
    setYearFilter(year);
    if (year === "todos") {
      setFromFilter("");
      setToFilter("");
    } else {
      setFromFilter(`${year}-01`);
      setToFilter(`${year}-12`);
    }
  }

  function handleFromChange(value: string) {
    setFromFilter(value);
    setYearFilter("todos");
  }

  function handleToChange(value: string) {
    setToFilter(value);
    setYearFilter("todos");
  }

  const filtered = useMemo(() => {
    return accOperations.filter((a) => {
      if (bankFilter !== "todos" && a.bankId !== bankFilter) return false;
      if (statusFilter !== "todos" && a.status !== statusFilter) return false;
      const month = a.contractDate.slice(0, 7);
      if (fromFilter && month < fromFilter) return false;
      if (toFilter && month > toFilter) return false;
      return true;
    });
  }, [accOperations, bankFilter, statusFilter, fromFilter, toFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(banks[0]?.id ?? ""));
    setError(null);
    setOpen(true);
  }

  function openEdit(acc: AccRow) {
    setEditingId(acc.id);
    setForm(formFromRow(acc));
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.contractNumber.trim()) {
      setError("Informe o numero do contrato.");
      return;
    }
    if (!form.vencimento) {
      setError("Informe o vencimento.");
      return;
    }
    if (!(Number(form.contractedValueForeign) > 0)) {
      setError("Informe o valor contratado (maior que zero).");
      return;
    }
    if (!(Number(form.spotRate) > 0)) {
      setError("Informe a Taxa Spot (maior que zero).");
      return;
    }
    if (!(Number(form.closingRate) > 0)) {
      setError("Informe a Taxa de Fechamento (maior que zero).");
      return;
    }
    if (!(Number(form.interestRateAnnual) > 0)) {
      setError("Informe a taxa de juros ao ano (maior que zero).");
      return;
    }
    setError(null);
    const payload = {
      bankId: form.bankId,
      contractNumber: form.contractNumber.trim(),
      contractedValueForeign: Number(form.contractedValueForeign) || 0,
      spotRate: Number(form.spotRate) || 0,
      closingRate: Number(form.closingRate) || 0,
      interestRateAnnual: Number(form.interestRateAnnual) || 0,
      contractDate: form.contractDate,
      vencimento: form.vencimento,
      dataQuitacao: form.dataQuitacao,
      exchangeVariationValue: Number(form.exchangeVariationValue) || 0,
      status: form.status,
      hasInsurance: form.hasInsurance,
      insuranceCost: Number(form.insuranceCost) || 0,
      otherCosts: Number(form.otherCosts) || 0,
      iof: Number(form.iof) || 0,
      bankFees: Number(form.bankFees) || 0,
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateAcc(editingId, payload);
        } else {
          await createAcc(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel salvar. Verifique se o numero do contrato ja existe.");
      }
    });
  }

  function handleDelete(acc: AccRow) {
    if (!window.confirm(`Excluir o ACC ${acc.accNumber}? Esta acao nao pode ser desfeita.`)) return;
    startTransition(async () => {
      await deleteAcc(acc.id);
      router.refresh();
    });
  }

  const monthlyRatePreview = annualToMonthly(Number(form.interestRateAnnual) || 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os bancos</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os status</option>
          <option value="EM_ABERTO">Em aberto</option>
          <option value="LIQUIDADO">Liquidado</option>
          <option value="EM_ATRASO">Em atraso</option>
        </Select>
        <Select value={yearFilter} onChange={(e) => applyYearFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Input
          type="month"
          value={fromFilter}
          onChange={(e) => handleFromChange(e.target.value)}
          className="w-auto"
          title="De"
        />
        <Input
          type="month"
          value={toFilter}
          onChange={(e) => handleToChange(e.target.value)}
          className="w-auto"
          title="Ate"
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Novo ACC
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar operacao de ACC" : "Cadastrar nova operacao de ACC"}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Numero do contrato</Label>
                  <Input
                    value={form.contractNumber}
                    onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                    placeholder="Ex: 2026001234"
                  />
                </div>
                <div>
                  <Label>Banco</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.bankId}
                      onChange={(e) => setForm({ ...form, bankId: e.target.value })}
                    >
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                    <NovoBanco compact />
                  </div>
                </div>
              </div>

              <div>
                <Label>Valor contratado (USD)</Label>
                <Input
                  type="number"
                  value={form.contractedValueForeign}
                  onChange={(e) => setForm({ ...form, contractedValueForeign: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Taxa Spot</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.spotRate}
                    onChange={(e) => setForm({ ...form, spotRate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Taxa Fechamento</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.closingRate}
                    onChange={(e) => setForm({ ...form, closingRate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Taxa de juros ao ano (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.interestRateAnnual}
                    onChange={(e) => setForm({ ...form, interestRateAnnual: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Taxa de juros ao mes (%)</Label>
                  <Input type="text" readOnly disabled value={formatPercent(monthlyRatePreview, 3)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data da contratacao</Label>
                  <Input
                    type="date"
                    value={form.contractDate}
                    onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={form.vencimento}
                    onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-3 text-sm font-medium">Quitacao (preencher ao liquidar)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Data da quitacao</Label>
                    <Input
                      type="date"
                      value={form.dataQuitacao}
                      onChange={(e) => setForm({ ...form, dataQuitacao: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Taxa de variacao cambial</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Ex: 4.9533"
                      value={form.exchangeVariationValue}
                      onChange={(e) => setForm({ ...form, exchangeVariationValue: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as StatusValue })}
                    >
                      <option value="EM_ABERTO">Em aberto</option>
                      <option value="LIQUIDADO">Liquidado</option>
                      <option value="EM_ATRASO">Em atraso</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>IOF (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.iof}
                    onChange={(e) => setForm({ ...form, iof: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tarifas (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.bankFees}
                    onChange={(e) => setForm({ ...form, bankFees: e.target.value })}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.hasInsurance}
                    onChange={(e) => setForm({ ...form, hasInsurance: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  Esta operacao teve seguro
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label>Custo do seguro (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      disabled={!form.hasInsurance}
                      value={form.insuranceCost}
                      onChange={(e) => setForm({ ...form, insuranceCost: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Outros custos (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.otherCosts}
                      onChange={(e) => setForm({ ...form, otherCosts: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Salvar alteracoes" : "Salvar ACC"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="max-h-[70vh] overflow-auto p-0">
          <table className="w-full whitespace-nowrap text-xs">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Data contratacao</th>
                <th className="px-4 py-3 font-medium">Valor contratado</th>
                <th className="px-4 py-3 font-medium">Saldo em aberto (USD)</th>
                <th className="px-4 py-3 font-medium">Recebido (R$)</th>
                <th className="px-4 py-3 font-medium">Taxa ao ano</th>
                <th className="px-4 py-3 font-medium">Taxa ao mes</th>
                <th className="px-4 py-3 font-medium">Valor do spread</th>
                <th className="px-4 py-3 font-medium">Juros (US$)</th>
                <th className="px-4 py-3 font-medium">Juros pagos (US$)</th>
                <th className="px-4 py-3 font-medium">Taxa cambio quitacao</th>
                <th className="px-4 py-3 font-medium">Juros pagos</th>
                <th className="px-4 py-3 font-medium">IOF</th>
                <th className="px-4 py-3 font-medium">Tarifas</th>
                <th className="px-4 py-3 font-medium">Seguro</th>
                <th className="px-4 py-3 font-medium">Custo total</th>
                <th className="px-4 py-3 font-medium">% Juros</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Data quitacao</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => (
                <tr key={acc.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{acc.accNumber}</td>
                  <td className="px-4 py-2.5">{acc.bankName}</td>
                  <td className="px-4 py-2.5">{formatDate(acc.contractDate)}</td>
                  <td className="px-4 py-2.5">
                    US$ {acc.contractedValueForeign.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5">
                    {acc.baixas.length > 0 || acc.status === "LIQUIDADO" ? (
                      <Badge variant={acc.saldoAbertoUSD <= 0 ? "success" : "warning"}>
                        US$ {acc.saldoAbertoUSD.toLocaleString("pt-BR")}
                      </Badge>
                    ) : (
                      <span className="text-muted">US$ {acc.contractedValueForeign.toLocaleString("pt-BR")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{formatCurrency(acc.receivedValueBRL)}</td>
                  <td className="px-4 py-2.5">{formatPercent(acc.interestRate)}</td>
                  <td className="px-4 py-2.5">{formatPercent(annualToMonthly(acc.interestRate), 3)}</td>
                  <td className={cn("px-4 py-2.5", acc.spreadValor < 0 && "text-danger")}>
                    {formatCurrency(acc.spreadValor)}
                  </td>
                  <td className="px-4 py-2.5">US$ {acc.jurosValorUSD.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">US$ {acc.jurosPagoUSD.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">
                    {acc.exchangeVariationValue > 0 ? (
                      acc.taxaConversaoJurosPagos.toFixed(4)
                    ) : (
                      <span className="text-muted">{acc.taxaConversaoJurosPagos.toFixed(4)}*</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">{formatCurrencyPrecise(acc.jurosPagoValor)}</td>
                  <td className="px-4 py-2.5">{formatCompactCurrency(acc.iof)}</td>
                  <td className="px-4 py-2.5">{formatCompactCurrency(acc.bankFees)}</td>
                  <td className="px-4 py-2.5">
                    {acc.hasInsurance ? (
                      <Badge variant="warning">{formatCompactCurrency(acc.insuranceCost)}</Badge>
                    ) : (
                      <span className="text-muted">Nao</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(acc.custoTotal)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatPercent(acc.percentualCustoTotal)}</td>
                  <td className="px-4 py-2.5">{formatDate(acc.settlementDate)}</td>
                  <td className="px-4 py-2.5">
                    {acc.dataQuitacao ? formatDate(acc.dataQuitacao) : <span className="text-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant[acc.status]}>
                      {statusLabels[acc.status] ?? acc.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openBaixas(acc)}
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Baixas parciais"
                      >
                        <Layers size={14} />
                      </button>
                      <Link
                        href={`/acc/${acc.id}`}
                        target="_blank"
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Relatorio para imprimir"
                      >
                        <Printer size={14} />
                      </Link>
                      <button
                        onClick={() => openEdit(acc)}
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc)}
                        className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={22} className="px-4 py-8 text-center text-muted">
                    Nenhuma operacao de ACC encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={baixasAccId !== null} onOpenChange={(v) => !v && setBaixasAccId(null)}>
        <DialogContent title={baixasAcc ? `Baixas parciais - ACC ${baixasAcc.accNumber}` : "Baixas parciais"}>
          {baixasAcc && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted">Valor contratado</p>
                  <p className="mt-1 font-semibold">US$ {baixasAcc.contractedValueForeign.toLocaleString("pt-BR")}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted">Já liquidado</p>
                  <p className="mt-1 font-semibold">US$ {baixasAcc.valorLiquidadoUSD.toLocaleString("pt-BR")}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted">Saldo em aberto</p>
                  <p className="mt-1 font-semibold">US$ {baixasAcc.saldoAbertoUSD.toLocaleString("pt-BR")}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="px-3 py-2 font-medium">Valor USD</th>
                      <th className="px-3 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium">Câmbio</th>
                      <th className="px-3 py-2 font-medium">Dias</th>
                      <th className="px-3 py-2 font-medium">Juros (US$)</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {baixasAcc.baixas.map((b) => {
                      const isEditing = editingBaixaId === b.id;
                      return (
                        <tr key={b.id} className="border-b border-border last:border-0">
                          {isEditing ? (
                            <>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={baixaDraft.valorUSD}
                                  onChange={(e) => setBaixaDraft({ ...baixaDraft, valorUSD: e.target.value })}
                                  className="h-7 w-24 rounded border border-border bg-background px-1.5 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={baixaDraft.dataQuitacao}
                                  onChange={(e) => setBaixaDraft({ ...baixaDraft, dataQuitacao: e.target.value })}
                                  className="h-7 w-32 rounded border border-border bg-background px-1.5 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={baixaDraft.closingRate}
                                  onChange={(e) => setBaixaDraft({ ...baixaDraft, closingRate: e.target.value })}
                                  className="h-7 w-20 rounded border border-border bg-background px-1.5 text-xs"
                                />
                              </td>
                              <td className="px-3 py-2 text-muted">-</td>
                              <td className="px-3 py-2 text-muted">-</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleSaveBaixa(b.id)}
                                    disabled={isPending}
                                    className="rounded p-1 text-success hover:bg-success/10"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingBaixaId(null)}
                                    className="rounded p-1 text-muted hover:bg-border/60"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2">US$ {b.valorUSD.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-2">{formatDate(b.dataQuitacao)}</td>
                              <td className="px-3 py-2">{b.closingRate.toFixed(4)}</td>
                              <td className="px-3 py-2">{b.dias}</td>
                              <td className="px-3 py-2">US$ {b.jurosUSD.toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => startEditBaixa(b)}
                                    className="rounded p-1 text-muted hover:bg-border/60 hover:text-foreground"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBaixa(b.id)}
                                    className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {baixasAcc.baixas.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-muted">
                          Nenhuma baixa lançada ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-medium">Lançar nova baixa</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Valor (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={novaBaixa.valorUSD}
                      onChange={(e) => setNovaBaixa({ ...novaBaixa, valorUSD: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Data da quitação</Label>
                    <Input
                      type="date"
                      value={novaBaixa.dataQuitacao}
                      onChange={(e) => setNovaBaixa({ ...novaBaixa, dataQuitacao: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Câmbio</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={novaBaixa.closingRate}
                      onChange={(e) => setNovaBaixa({ ...novaBaixa, closingRate: e.target.value })}
                    />
                  </div>
                </div>
                {novaBaixaPreview && (
                  <p className="mt-2 text-xs text-muted">
                    {novaBaixaPreview.dias} dias de {formatDate(baixasAcc.contractDate)} até{" "}
                    {formatDate(novaBaixa.dataQuitacao)} → juros de US${" "}
                    {novaBaixaPreview.jurosUSD.toLocaleString("pt-BR")}
                  </p>
                )}
                {baixaError && <p className="mt-2 text-sm text-danger">{baixaError}</p>}
                <Button className="mt-3 w-full" size="sm" onClick={handleAddBaixa} disabled={isPending}>
                  Adicionar baixa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
