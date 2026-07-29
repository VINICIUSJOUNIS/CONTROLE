"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { LoanRow } from "@/lib/data";
import { createLoan, deleteLoan, updateLoan } from "@/app/(dashboard)/emprestimos/actions";
import { NovoBanco } from "@/components/bancos/novo-banco";
import { buildAmortizationSchedule } from "@/lib/amortization";
import { Plus, Search, Pencil, Trash2, Table2 } from "lucide-react";

type Bank = { id: string; name: string; color: string };
type StatusValue = "ATIVO" | "LIQUIDADO" | "EM_ATRASO";

const statusVariant: Record<string, "success" | "danger" | "neutral"> = {
  ATIVO: "success",
  LIQUIDADO: "neutral",
  EM_ATRASO: "danger",
};

const statusLabels: Record<string, string> = {
  ATIVO: "Ativo",
  LIQUIDADO: "Liquidado",
  EM_ATRASO: "Em atraso",
};

function emptyForm(defaultBankId: string) {
  return {
    bankId: defaultBankId,
    contractNumber: "",
    purpose: "",
    contractedValue: "",
    interestRate: "",
    indexer: "CDI" as "CDI" | "SOFR" | "PRE_FIXADO" | "SELIC",
    installments: "12",
    contractDate: new Date().toISOString().slice(0, 10),
    vencimento: "",
    status: "ATIVO" as StatusValue,
    iof: "",
    hasInsurance: false,
    insuranceCost: "",
    otherCosts: "",
  };
}

function formFromRow(loan: LoanRow) {
  return {
    bankId: loan.bankId,
    contractNumber: loan.contractNumber,
    purpose: loan.purpose,
    contractedValue: String(loan.contractedValue),
    interestRate: String(loan.interestRate),
    indexer: loan.indexer as "CDI" | "SOFR" | "PRE_FIXADO" | "SELIC",
    installments: String(loan.installments),
    contractDate: loan.contractDate,
    vencimento: loan.lastDueDate,
    status: loan.status as StatusValue,
    iof: String(loan.iof),
    hasInsurance: loan.hasInsurance,
    insuranceCost: String(loan.insuranceCost),
    otherCosts: String(loan.otherCosts),
  };
}

export function EmprestimosView({
  banks,
  initialLoans,
}: {
  banks: Bank[];
  initialLoans: LoanRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [yearFilter, setYearFilter] = useState("todos");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(banks[0]?.id ?? ""));
  const [amortizacaoLoan, setAmortizacaoLoan] = useState<LoanRow | null>(null);

  const amortizacaoSchedule = useMemo(
    () => (amortizacaoLoan ? buildAmortizationSchedule(amortizacaoLoan) : []),
    [amortizacaoLoan]
  );

  const years = useMemo(
    () => Array.from(new Set(initialLoans.map((l) => l.contractDate.slice(0, 4)))).sort(),
    [initialLoans]
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
    return initialLoans.filter((l) => {
      if (bankFilter !== "todos" && l.bankId !== bankFilter) return false;
      if (statusFilter !== "todos" && l.status !== statusFilter) return false;
      if (search && !l.contractNumber.toLowerCase().includes(search.toLowerCase())) return false;
      const month = l.contractDate.slice(0, 7);
      if (fromFilter && month < fromFilter) return false;
      if (toFilter && month > toFilter) return false;
      return true;
    });
  }, [initialLoans, bankFilter, statusFilter, search, fromFilter, toFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(banks[0]?.id ?? ""));
    setError(null);
    setOpen(true);
  }

  function openEdit(loan: LoanRow) {
    setEditingId(loan.id);
    setForm(formFromRow(loan));
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
    if (!(Number(form.contractedValue) > 0)) {
      setError("Informe o valor contratado (maior que zero).");
      return;
    }
    if (!(Number(form.interestRate) > 0)) {
      setError("Informe a taxa de juros (maior que zero).");
      return;
    }
    setError(null);
    const payload = {
      bankId: form.bankId,
      contractNumber: form.contractNumber.trim(),
      purpose: form.purpose,
      contractedValue: Number(form.contractedValue) || 0,
      interestRate: Number(form.interestRate) || 0,
      indexer: form.indexer,
      installments: Number(form.installments) || 12,
      contractDate: form.contractDate,
      vencimento: form.vencimento,
      status: form.status,
      iof: Number(form.iof) || 0,
      hasInsurance: form.hasInsurance,
      insuranceCost: Number(form.insuranceCost) || 0,
      otherCosts: Number(form.otherCosts) || 0,
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateLoan(editingId, payload);
        } else {
          await createLoan(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel salvar. Verifique se o numero do contrato ja existe.");
      }
    });
  }

  function handleDelete(loan: LoanRow) {
    if (!window.confirm(`Excluir o emprestimo ${loan.contractNumber}? Esta acao nao pode ser desfeita.`))
      return;
    startTransition(async () => {
      await deleteLoan(loan.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por numero do contrato"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
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
          <option value="ATIVO">Ativo</option>
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
              Novo emprestimo
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar emprestimo" : "Cadastrar novo emprestimo"}>
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
                    <Select value={form.bankId} onChange={(e) => setForm({ ...form, bankId: e.target.value })}>
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
                <Label>Finalidade</Label>
                <Input
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="Ex: Capital de giro"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor contratado (R$)</Label>
                  <Input
                    type="number"
                    value={form.contractedValue}
                    onChange={(e) => setForm({ ...form, contractedValue: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Taxa de juros (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Indexador</Label>
                  <Select
                    value={form.indexer}
                    onChange={(e) =>
                      setForm({ ...form, indexer: e.target.value as typeof form.indexer })
                    }
                  >
                    <option value="CDI">CDI</option>
                    <option value="SOFR">SOFR</option>
                    <option value="PRE_FIXADO">Pre-fixado</option>
                    <option value="SELIC">SELIC</option>
                  </Select>
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <Input
                    type="number"
                    value={form.installments}
                    onChange={(e) => setForm({ ...form, installments: e.target.value })}
                  />
                </div>
                <div>
                  <Label>IOF (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.iof}
                    onChange={(e) => setForm({ ...form, iof: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StatusValue })}
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="LIQUIDADO">Liquidado</option>
                    <option value="EM_ATRASO">Em atraso</option>
                  </Select>
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
                  Este emprestimo teve seguro
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
                {isPending ? "Salvando..." : editingId ? "Salvar alteracoes" : "Salvar emprestimo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full whitespace-nowrap text-xs">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Valor contratado</th>
                <th className="px-4 py-3 font-medium">Taxa</th>
                <th className="px-4 py-3 font-medium">Prazo (meses)</th>
                <th className="px-4 py-3 font-medium">Juros (R$)</th>
                <th className="px-4 py-3 font-medium">IOF</th>
                <th className="px-4 py-3 font-medium">Seguro</th>
                <th className="px-4 py-3 font-medium">Custo total</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((loan) => (
                <tr key={loan.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{loan.contractNumber}</td>
                  <td className="px-4 py-2.5">{loan.bankName}</td>
                  <td className="px-4 py-2.5">{formatCompactCurrency(loan.contractedValue)}</td>
                  <td className="px-4 py-2.5">{formatPercent(loan.interestRate)}</td>
                  <td className="px-4 py-2.5">{loan.prazoMeses}</td>
                  <td className="px-4 py-2.5">{formatCurrencyPrecise(loan.jurosValor)}</td>
                  <td className="px-4 py-2.5">{formatCompactCurrency(loan.iof)}</td>
                  <td className="px-4 py-2.5">
                    {loan.hasInsurance ? (
                      <Badge variant="warning">{formatCompactCurrency(loan.insuranceCost)}</Badge>
                    ) : (
                      <span className="text-muted">Nao</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(loan.custoTotal)}</td>
                  <td className="px-4 py-2.5">{formatDate(loan.lastDueDate)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant[loan.status]}>
                      {statusLabels[loan.status] ?? loan.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setAmortizacaoLoan(loan)}
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Ver amortizacao"
                      >
                        <Table2 size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(loan)}
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(loan)}
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
                  <td colSpan={12} className="px-4 py-8 text-center text-muted">
                    Nenhum emprestimo encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={amortizacaoLoan !== null} onOpenChange={(next) => !next && setAmortizacaoLoan(null)}>
        <DialogContent
          title={amortizacaoLoan ? `Amortizacao - ${amortizacaoLoan.contractNumber}` : "Amortizacao"}
          className="max-w-3xl"
        >
          <div className="max-h-[65vh] overflow-y-auto">
            <table className="w-full whitespace-nowrap text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-3 py-2 font-medium">Parcela</th>
                  <th className="px-3 py-2 font-medium">Vencimento</th>
                  <th className="px-3 py-2 font-medium">Amortizacao</th>
                  <th className="px-3 py-2 font-medium">Juros</th>
                  <th className="px-3 py-2 font-medium">Valor da parcela</th>
                  <th className="px-3 py-2 font-medium">Pago acumulado</th>
                  <th className="px-3 py-2 font-medium">Saldo devedor</th>
                </tr>
              </thead>
              <tbody>
                {amortizacaoSchedule.map((row) => (
                  <tr key={row.numero} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{row.numero}</td>
                    <td className="px-3 py-2">{formatDate(row.vencimento)}</td>
                    <td className="px-3 py-2">{formatCurrencyPrecise(row.amortizacao)}</td>
                    <td className="px-3 py-2">{formatCurrencyPrecise(row.juros)}</td>
                    <td className="px-3 py-2 font-medium">{formatCurrencyPrecise(row.valorParcela)}</td>
                    <td className="px-3 py-2">{formatCurrencyPrecise(row.pagoAcumulado)}</td>
                    <td className="px-3 py-2">{formatCurrencyPrecise(row.saldoDevedor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
