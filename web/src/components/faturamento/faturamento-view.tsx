"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCurrency, formatDate } from "@/lib/format";
import { SaleRow, SaleReturnRow } from "@/lib/data";
import { createSale, deleteSale, updateSale, SaleFormInput } from "@/app/(dashboard)/faturamento/vendas/actions";
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
    containers20: "",
    containers40: "",
    saleDate: new Date().toISOString().slice(0, 10),
    valueBRL: "",
    valueUSD: "",
    diferencial: "",
  };
}

function formFromRow(sale: SaleRow) {
  return {
    clientName: sale.clientName,
    clientType: sale.clientType as ClientTypeValue,
    quantityKg: String(sale.quantityKg),
    country: sale.country ?? "",
    containers20: sale.containers20 != null ? String(sale.containers20) : "",
    containers40: sale.containers40 != null ? String(sale.containers40) : "",
    saleDate: sale.saleDate,
    valueBRL: String(sale.valueBRL),
    valueUSD: sale.valueUSD != null ? String(sale.valueUSD) : "",
    diferencial: sale.diferencial != null ? String(sale.diferencial) : "",
  };
}

export function FaturamentoView({ sales, returns }: { sales: SaleRow[]; returns: SaleReturnRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientTypeFilter, setClientTypeFilter] = useState("todos");
  const [clientFilter, setClientFilter] = useState("todos");
  const [countryFilter, setCountryFilter] = useState("todos");
  const [yearFilter, setYearFilter] = useState("todos");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const years = useMemo(
    () => Array.from(new Set(sales.map((s) => s.saleDate.slice(0, 4)))).sort(),
    [sales]
  );

  const clients = useMemo(() => {
    const scoped = clientTypeFilter === "todos" ? sales : sales.filter((s) => s.clientType === clientTypeFilter);
    return Array.from(new Set(scoped.map((s) => s.clientName))).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [sales, clientTypeFilter]);

  const countries = useMemo(() => {
    const ids = Array.from(new Set(sales.map((s) => s.country).filter((c): c is string => Boolean(c))));
    return ids.sort((a, b) => countryLabel(a).localeCompare(countryLabel(b), "pt-BR"));
  }, [sales]);

  function handleClientTypeFilterChange(value: string) {
    setClientTypeFilter(value);
    setClientFilter("todos");
  }

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
    return sales.filter((s) => {
      if (clientTypeFilter !== "todos" && s.clientType !== clientTypeFilter) return false;
      if (clientFilter !== "todos" && s.clientName !== clientFilter) return false;
      if (countryFilter !== "todos" && s.country !== countryFilter) return false;
      const month = s.saleDate.slice(0, 7);
      if (fromFilter && month < fromFilter) return false;
      if (toFilter && month > toFilter) return false;
      return true;
    });
  }, [sales, clientTypeFilter, clientFilter, countryFilter, fromFilter, toFilter]);

  // Devolucoes no mesmo periodo (from/to) selecionado para as vendas, abatidas dos
  // totais abaixo. Devolucao nao tem tipo de cliente/pais, entao so o filtro de
  // data se aplica aqui (os demais filtros de venda nao tem equivalente nela).
  const returnsInPeriod = useMemo(() => {
    return returns.filter((r) => {
      const month = r.returnDate.slice(0, 7);
      if (fromFilter && month < fromFilter) return false;
      if (toFilter && month > toFilter) return false;
      return true;
    });
  }, [returns, fromFilter, toFilter]);

  const devolucaoKg = returnsInPeriod.reduce((s, r) => s + r.quantityKg, 0);
  const devolucaoSacas = returnsInPeriod.reduce((s, r) => s + r.quantitySacas, 0);
  const devolucaoBRL = returnsInPeriod.reduce((s, r) => s + r.valueBRL, 0);

  const totalKg = filtered.reduce((s, v) => s + v.quantityKg, 0) - devolucaoKg;
  const totalSacas = filtered.reduce((s, v) => s + v.quantitySacas, 0) - devolucaoSacas;
  const totalBRL = filtered.reduce((s, v) => s + v.valueBRL, 0) - devolucaoBRL;

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
      containers20: form.containers20 ? Number(form.containers20) : null,
      containers40: form.containers40 ? Number(form.containers40) : null,
      saleDate: form.saleDate,
      valueBRL: Number(form.valueBRL) || 0,
      valueUSD: form.valueUSD ? Number(form.valueUSD) : null,
      diferencial: form.diferencial.trim() ? Number(form.diferencial) : null,
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
          {devolucaoKg > 0 && (
            <p className="mt-1 text-xs text-muted">
              já descontado {devolucaoKg.toLocaleString("pt-BR")} kg de devolução
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Total vendido (sacas de 60kg)</p>
          <p className="mt-1.5 text-xl font-semibold">
            {totalSacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </p>
          {devolucaoSacas > 0 && (
            <p className="mt-1 text-xs text-muted">
              já descontado {devolucaoSacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} sacas de devolução
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-muted">Total faturado (R$)</p>
          <p className="mt-1.5 text-xl font-semibold">{formatCurrency(totalBRL)}</p>
          {devolucaoBRL > 0 && (
            <p className="mt-1 text-xs text-muted">já descontado {formatCurrency(devolucaoBRL)} de devolução</p>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={clientTypeFilter} onChange={(e) => handleClientTypeFilterChange(e.target.value)} className="w-auto">
          <option value="todos">Todos os tipos</option>
          <option value="INTERNO">Interno</option>
          <option value="EXTERNO">Externo</option>
        </Select>
        <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os países</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryLabel(c)}
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

              <div>
                <Label>Diferencial</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.diferencial}
                  onChange={(e) => setForm({ ...form, diferencial: e.target.value })}
                />
              </div>

              {isExterno && (
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-3 text-sm font-medium">Dados de exportação</p>
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
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <Label>Contêineres de 20 pés</Label>
                      <Input
                        type="number"
                        value={form.containers20}
                        onChange={(e) => setForm({ ...form, containers20: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Contêineres de 40 pés</Label>
                      <Input
                        type="number"
                        value={form.containers40}
                        onChange={(e) => setForm({ ...form, containers40: e.target.value })}
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
        <CardContent className="max-h-[70vh] overflow-auto p-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Quantidade (kg)</th>
                <th className="px-4 py-3 font-medium">Sacas (60kg)</th>
                <th className="px-4 py-3 font-medium">País</th>
                <th className="px-4 py-3 font-medium">Cnt 20'</th>
                <th className="px-4 py-3 font-medium">Cnt 40'</th>
                <th className="px-4 py-3 font-medium">Valor (R$)</th>
                <th className="px-4 py-3 font-medium">Valor (US$)</th>
                <th className="px-4 py-3 font-medium">Diferencial</th>
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
                  <td className="px-4 py-2.5">
                    {s.quantitySacas.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.country ? countryLabel(s.country) : <span className="text-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">{s.containers20 ?? <span className="text-muted">-</span>}</td>
                  <td className="px-4 py-2.5">{s.containers40 ?? <span className="text-muted">-</span>}</td>
                  <td className="px-4 py-2.5">{formatCurrency(s.valueBRL)}</td>
                  <td className="px-4 py-2.5">
                    {s.valueUSD != null ? `US$ ${s.valueUSD.toLocaleString("pt-BR")}` : <span className="text-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.diferencial != null ? (
                      `${s.diferencial >= 0 ? "+" : ""}${s.diferencial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-muted">-</span>
                    )}
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
                  <td colSpan={12} className="px-4 py-8 text-center text-muted">
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
