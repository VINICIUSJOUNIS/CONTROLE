"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCurrency, formatDate } from "@/lib/format";
import { SaleRow } from "@/lib/data";
import { createSale, deleteSale, updateSale, SaleFormInput } from "@/app/(dashboard)/faturamento/actions";
import { COUNTRIES, countryLabel } from "@/lib/countries";
import { Plus, Pencil, Trash2 } from "lucide-react";

type ClientTypeValue = "INTERNO" | "EXTERNO";

const clientTypeLabels: Record<ClientTypeValue, string> = {
  INTERNO: "Interno",
  EXTERNO: "Externo",
};

function emptyForm() {
  return {
    clientName: "",
    clientType: "INTERNO" as ClientTypeValue,
    quantityKg: "",
    country: "",
    containerCount: "",
    saleDate: new Date().toISOString().slice(0, 10),
    valueBRL: "",
    valueUSD: "",
  };
}

function formFromRow(sale: SaleRow) {
  return {
    clientName: sale.clientName,
    clientType: sale.clientType as ClientTypeValue,
    quantityKg: String(sale.quantityKg),
    country: sale.country ?? "",
    containerCount: sale.containerCount != null ? String(sale.containerCount) : "",
    saleDate: sale.saleDate,
    valueBRL: String(sale.valueBRL),
    valueUSD: sale.valueUSD != null ? String(sale.valueUSD) : "",
  };
}

export function FaturamentoView({ sales }: { sales: SaleRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientTypeFilter, setClientTypeFilter] = useState("todos");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (clientTypeFilter !== "todos" && s.clientType !== clientTypeFilter) return false;
      const month = s.saleDate.slice(0, 7);
      if (fromFilter && month < fromFilter) return false;
      if (toFilter && month > toFilter) return false;
      return true;
    });
  }, [sales, clientTypeFilter, fromFilter, toFilter]);

  const totalKg = filtered.reduce((s, v) => s + v.quantityKg, 0);
  const totalSacas = filtered.reduce((s, v) => s + v.quantitySacas, 0);
  const totalBRL = filtered.reduce((s, v) => s + v.valueBRL, 0);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(sale: SaleRow) {
    setEditingId(sale.id);
    setForm(formFromRow(sale));
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.clientName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!(Number(form.quantityKg) > 0)) {
      setError("Informe a quantidade vendida (kg), maior que zero.");
      return;
    }
    if (!form.saleDate) {
      setError("Informe a data da venda.");
      return;
    }
    if (!(Number(form.valueBRL) >= 0)) {
      setError("Informe o valor em R$.");
      return;
    }
    setError(null);
    const payload: SaleFormInput = {
      clientName: form.clientName.trim(),
      clientType: form.clientType,
      quantityKg: Number(form.quantityKg) || 0,
      country: form.country.trim(),
      containerCount: form.containerCount ? Number(form.containerCount) : null,
      saleDate: form.saleDate,
      valueBRL: Number(form.valueBRL) || 0,
      valueUSD: form.valueUSD ? Number(form.valueUSD) : null,
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateSale(editingId, payload);
        } else {
          await createSale(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel salvar a venda.");
      }
    });
  }

  function handleDelete(sale: SaleRow) {
    if (!window.confirm(`Excluir a venda de ${sale.clientName}? Esta acao nao pode ser desfeita.`)) return;
    startTransition(async () => {
      await deleteSale(sale.id);
      router.refresh();
    });
  }

  const isExterno = form.clientType === "EXTERNO";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Total vendido (kg)</p>
          <p className="mt-1.5 text-xl font-semibold">{totalKg.toLocaleString("pt-BR")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Total vendido (sacas de 60kg)</p>
          <p className="mt-1.5 text-xl font-semibold">{totalSacas.toLocaleString("pt-BR")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Total faturado (R$)</p>
          <p className="mt-1.5 text-xl font-semibold">{formatCurrency(totalBRL)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={clientTypeFilter} onChange={(e) => setClientTypeFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os clientes</option>
          <option value="INTERNO">Interno</option>
          <option value="EXTERNO">Externo</option>
        </Select>
        <Input
          type="month"
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
          className="w-auto"
          title="De"
        />
        <Input
          type="month"
          value={toFilter}
          onChange={(e) => setToFilter(e.target.value)}
          className="w-auto"
          title="Ate"
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar venda" : "Cadastrar nova venda"}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome do cliente</Label>
                  <Input
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    placeholder="Ex: Café Comércio Ltda"
                  />
                </div>
                <div>
                  <Label>Tipo de cliente</Label>
                  <Select
                    value={form.clientType}
                    onChange={(e) => setForm({ ...form, clientType: e.target.value as ClientTypeValue })}
                  >
                    <option value="INTERNO">Interno</option>
                    <option value="EXTERNO">Externo</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade vendida (kg)</Label>
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
                  <Label>Data da venda</Label>
                  <Input
                    type="date"
                    value={form.saleDate}
                    onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
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

              {isExterno && (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-3 text-sm font-medium">Dados de exportação</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>País</Label>
                      <Select
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                      >
                        <option value="">Selecione...</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.labelPt}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Quantidade de contêineres</Label>
                      <Input
                        type="number"
                        value={form.containerCount}
                        onChange={(e) => setForm({ ...form, containerCount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label>Valor (US$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.valueUSD}
                      onChange={(e) => setForm({ ...form, valueUSD: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar venda"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Quantidade (kg)</th>
                <th className="px-4 py-3 font-medium">Sacas (60kg)</th>
                <th className="px-4 py-3 font-medium">País</th>
                <th className="px-4 py-3 font-medium">Contêineres</th>
                <th className="px-4 py-3 font-medium">Valor (R$)</th>
                <th className="px-4 py-3 font-medium">Valor (US$)</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{s.clientName}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={s.clientType === "EXTERNO" ? "warning" : "neutral"}>
                      {clientTypeLabels[s.clientType as ClientTypeValue] ?? s.clientType}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">{formatDate(s.saleDate)}</td>
                  <td className="px-4 py-2.5">{s.quantityKg.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">{s.quantitySacas.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">
                    {s.country ? countryLabel(s.country) : <span className="text-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">{s.containerCount ?? <span className="text-muted">-</span>}</td>
                  <td className="px-4 py-2.5">{formatCurrency(s.valueBRL)}</td>
                  <td className="px-4 py-2.5">
                    {s.valueUSD != null ? `US$ ${s.valueUSD.toLocaleString("pt-BR")}` : <span className="text-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
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
                  <td colSpan={10} className="px-4 py-8 text-center text-muted">
                    Nenhuma venda encontrada com os filtros atuais.
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
