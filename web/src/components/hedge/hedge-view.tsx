"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCurrency, formatDate } from "@/lib/format";
import { HedgeRow } from "@/lib/hedge-data";
import { createHedge, deleteHedge, updateHedge } from "@/app/(dashboard)/hedge/operacoes-hedge/actions";
import { NovaCorretora } from "@/components/hedge/corretoras/nova-corretora";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Corretora = { id: string; name: string; color: string };
type ContractTypeValue = "NDF" | "TRAVA";
type SideValue = "COMPRA" | "VENDA" | "";
type StatusValue = "A_LIQUIDAR" | "LIQUIDADA";

const statusVariant: Record<string, "success" | "warning"> = {
  A_LIQUIDAR: "warning",
  LIQUIDADA: "success",
};

const statusLabels: Record<string, string> = {
  A_LIQUIDAR: "A liquidar",
  LIQUIDADA: "Liquidada",
};

const sideLabels: Record<string, string> = {
  COMPRA: "Compra",
  VENDA: "Venda",
};

function emptyForm(defaultCorretoraId: string) {
  return {
    corretoraId: defaultCorretoraId,
    contractType: "NDF" as ContractTypeValue,
    side: "COMPRA" as SideValue,
    contractDate: new Date().toISOString().slice(0, 10),
    vencimento: "",
    valorUsd: "",
    liquidacaoParcialUsd: "0",
    nivelCompra: "",
    nivelVenda: "",
    desagioValor: "0",
    totalReais: "0",
    status: "A_LIQUIDAR" as StatusValue,
    observacao: "",
  };
}

function formFromRow(row: HedgeRow) {
  return {
    corretoraId: row.corretoraId,
    contractType: row.contractType as ContractTypeValue,
    side: (row.side ?? "") as SideValue,
    contractDate: row.contractDate,
    vencimento: row.vencimento,
    valorUsd: String(row.valorUsd),
    liquidacaoParcialUsd: String(row.liquidacaoParcialUsd),
    nivelCompra: String(row.nivelCompra),
    nivelVenda: String(row.nivelVenda),
    desagioValor: String(row.desagioValor),
    totalReais: String(row.totalReais),
    status: row.status as StatusValue,
    observacao: row.observacao ?? "",
  };
}

export function HedgeView({
  corretoras,
  operations,
}: {
  corretoras: Corretora[];
  operations: HedgeRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [corretoraFilter, setCorretoraFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(corretoras[0]?.id ?? ""));

  const filtered = useMemo(() => {
    return operations.filter((o) => {
      if (corretoraFilter !== "todos" && o.corretoraId !== corretoraFilter) return false;
      if (statusFilter !== "todos" && o.status !== statusFilter) return false;
      return true;
    });
  }, [operations, corretoraFilter, statusFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(corretoras[0]?.id ?? ""));
    setError(null);
    setOpen(true);
  }

  function openEdit(row: HedgeRow) {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.corretoraId) {
      setError("Selecione a corretora/banco.");
      return;
    }
    if (!form.vencimento) {
      setError("Informe o vencimento.");
      return;
    }
    if (!(Number(form.valorUsd) > 0)) {
      setError("Informe o valor em US$ (maior que zero).");
      return;
    }
    setError(null);
    const payload = {
      corretoraId: form.corretoraId,
      contractType: form.contractType,
      side: form.side === "" ? null : form.side,
      contractDate: form.contractDate,
      vencimento: form.vencimento,
      valorUsd: Number(form.valorUsd) || 0,
      liquidacaoParcialUsd: Number(form.liquidacaoParcialUsd) || 0,
      nivelCompra: Number(form.nivelCompra) || 0,
      nivelVenda: Number(form.nivelVenda) || 0,
      desagioValor: Number(form.desagioValor) || 0,
      totalReais: Number(form.totalReais) || 0,
      status: form.status,
      observacao: form.observacao.trim(),
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateHedge(editingId, payload);
        } else {
          await createHedge(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel salvar a operacao.");
      }
    });
  }

  function handleDelete(row: HedgeRow) {
    if (!window.confirm("Excluir esta operacao de hedge? Esta acao nao pode ser desfeita.")) return;
    startTransition(async () => {
      await deleteHedge(row.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={corretoraFilter}
          onChange={(e) => setCorretoraFilter(e.target.value)}
          className="w-auto"
        >
          <option value="todos">Todas as corretoras</option>
          {corretoras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os status</option>
          <option value="A_LIQUIDAR">A liquidar</option>
          <option value="LIQUIDADA">Liquidada</option>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nova operacao
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar operacao de hedge" : "Cadastrar operacao de hedge"}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de contrato</Label>
                  <Select
                    value={form.contractType}
                    onChange={(e) =>
                      setForm({ ...form, contractType: e.target.value as ContractTypeValue })
                    }
                  >
                    <option value="NDF">NDF</option>
                    <option value="TRAVA">Trava</option>
                  </Select>
                </div>
                <div>
                  <Label>Corretora/Banco</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.corretoraId}
                      onChange={(e) => setForm({ ...form, corretoraId: e.target.value })}
                    >
                      {corretoras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <NovaCorretora compact />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Operacao</Label>
                  <Select
                    value={form.side}
                    onChange={(e) => setForm({ ...form, side: e.target.value as SideValue })}
                  >
                    <option value="COMPRA">Compra</option>
                    <option value="VENDA">Venda</option>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StatusValue })}
                  >
                    <option value="A_LIQUIDAR">A liquidar</option>
                    <option value="LIQUIDADA">Liquidada</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Valor em US$</Label>
                <Input
                  type="number"
                  value={form.valorUsd}
                  onChange={(e) => setForm({ ...form, valorUsd: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nivel compra (taxa)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.nivelCompra}
                    onChange={(e) => setForm({ ...form, nivelCompra: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nivel venda (taxa)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.nivelVenda}
                    onChange={(e) => setForm({ ...form, nivelVenda: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data da operacao</Label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Liquidacao parcial (US$)</Label>
                  <Input
                    type="number"
                    value={form.liquidacaoParcialUsd}
                    onChange={(e) => setForm({ ...form, liquidacaoParcialUsd: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Deságio/premio (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.desagioValor}
                    onChange={(e) => setForm({ ...form, desagioValor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Total R$</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalReais}
                  onChange={(e) => setForm({ ...form, totalReais: e.target.value })}
                />
              </div>

              <div>
                <Label>Observacao</Label>
                <Input
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Salvar alteracoes" : "Salvar operacao"}
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
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Corretora</th>
                <th className="px-4 py-3 font-medium">Operacao</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Valor US$</th>
                <th className="px-4 py-3 font-medium">Nivel compra</th>
                <th className="px-4 py-3 font-medium">Nivel venda</th>
                <th className="px-4 py-3 font-medium">Liquidacao parcial</th>
                <th className="px-4 py-3 font-medium">Saldo US$</th>
                <th className="px-4 py-3 font-medium">Total R$</th>
                <th className="px-4 py-3 font-medium">Desagio</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{row.contractType}</td>
                  <td className="px-4 py-2.5">{row.corretoraName}</td>
                  <td className="px-4 py-2.5">{row.side ? sideLabels[row.side] : "-"}</td>
                  <td className="px-4 py-2.5">{formatDate(row.contractDate)}</td>
                  <td className="px-4 py-2.5">US$ {row.valorUsd.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">{row.nivelCompra > 0 ? row.nivelCompra.toFixed(4) : "-"}</td>
                  <td className="px-4 py-2.5">{row.nivelVenda > 0 ? row.nivelVenda.toFixed(4) : "-"}</td>
                  <td className="px-4 py-2.5">US$ {row.liquidacaoParcialUsd.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5 font-medium">US$ {row.saldoUsd.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.totalReais)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(row.desagioValor)}</td>
                  <td className="px-4 py-2.5">{formatDate(row.vencimento)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant[row.status]}>
                      {statusLabels[row.status] ?? row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(row)}
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
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
                  <td colSpan={14} className="px-4 py-8 text-center text-muted">
                    Nenhuma operacao de hedge encontrada com os filtros atuais.
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
