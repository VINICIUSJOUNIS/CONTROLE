"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCurrency, formatDate } from "@/lib/format";
import { SaleReturnRow } from "@/lib/data";
import {
  createSaleReturn,
  deleteSaleReturn,
  updateSaleReturn,
  SaleReturnFormInput,
} from "@/app/(dashboard)/faturamento/devolucoes/actions";
import { Plus, Pencil, Trash2 } from "lucide-react";

function emptyForm() {
  return {
    clientName: "",
    quantityKg: "",
    returnDate: new Date().toISOString().slice(0, 10),
    valueBRL: "",
  };
}

function formFromRow(row: SaleReturnRow) {
  return {
    clientName: row.clientName,
    quantityKg: String(row.quantityKg),
    returnDate: row.returnDate,
    valueBRL: String(row.valueBRL),
  };
}

export function DevolucoesView({ returns }: { returns: SaleReturnRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientFilter, setClientFilter] = useState("todos");
  const [yearFilter, setYearFilter] = useState("todos");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const years = useMemo(
    () => Array.from(new Set(returns.map((r) => r.returnDate.slice(0, 4)))).sort(),
    [returns]
  );

  const clients = useMemo(
    () => Array.from(new Set(returns.map((r) => r.clientName))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [returns]
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
    return returns.filter((r) => {
      if (clientFilter !== "todos" && r.clientName !== clientFilter) return false;
      const month = r.returnDate.slice(0, 7);
      if (fromFilter && month < fromFilter) return false;
      if (toFilter && month > toFilter) return false;
      return true;
    });
  }, [returns, clientFilter, fromFilter, toFilter]);

  const totalKg = filtered.reduce((s, v) => s + v.quantityKg, 0);
  const totalSacas = filtered.reduce((s, v) => s + v.quantitySacas, 0);
  const totalBRL = filtered.reduce((s, v) => s + v.valueBRL, 0);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(row: SaleReturnRow) {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.clientName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!(Number(form.quantityKg) > 0)) {
      setError("Informe a quantidade devolvida (kg), maior que zero.");
      return;
    }
    if (!form.returnDate) {
      setError("Informe a data da devolução.");
      return;
    }
    if (!(Number(form.valueBRL) >= 0)) {
      setError("Informe o valor em R$.");
      return;
    }
    setError(null);
    const payload: SaleReturnFormInput = {
      clientName: form.clientName.trim(),
      quantityKg: Number(form.quantityKg) || 0,
      returnDate: form.returnDate,
      valueBRL: Number(form.valueBRL) || 0,
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateSaleReturn(editingId, payload);
        } else {
          await createSaleReturn(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Não foi possível salvar a devolução.");
      }
    });
  }

  function handleDelete(row: SaleReturnRow) {
    if (!window.confirm(`Excluir a devolução de ${row.clientName}? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      await deleteSaleReturn(row.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Total devolvido (kg)</p>
          <p className="mt-1.5 text-xl font-semibold">{totalKg.toLocaleString("pt-BR")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Total devolvido (sacas de 60kg)</p>
          <p className="mt-1.5 text-xl font-semibold">
            {totalSacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Total devolvido (R$)</p>
          <p className="mt-1.5 text-xl font-semibold">{formatCurrency(totalBRL)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
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
          title="Até"
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nova Devolução
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar devolução" : "Cadastrar devolução"}>
            <div className="space-y-3">
              <div>
                <Label>Nome do cliente</Label>
                <Input
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Ex: Café Comércio Ltda"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade devolvida (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.quantityKg}
                    onChange={(e) => setForm({ ...form, quantityKg: e.target.value })}
                  />
                  {Number(form.quantityKg) > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      {(Number(form.quantityKg) / 60).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} sacas
                      de 60kg
                    </p>
                  )}
                </div>
                <div>
                  <Label>Data da devolução</Label>
                  <Input
                    type="date"
                    value={form.returnDate}
                    onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valueBRL}
                  onChange={(e) => setForm({ ...form, valueBRL: e.target.value })}
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar devolução"}
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
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Quantidade (kg)</th>
                <th className="px-4 py-3 font-medium">Sacas (60kg)</th>
                <th className="px-4 py-3 font-medium">Valor (R$)</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{r.clientName}</td>
                  <td className="px-4 py-2.5">{formatDate(r.returnDate)}</td>
                  <td className="px-4 py-2.5">{r.quantityKg.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">
                    {r.quantitySacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-2.5">{formatCurrency(r.valueBRL)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(r)}
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
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
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Nenhuma devolução encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
