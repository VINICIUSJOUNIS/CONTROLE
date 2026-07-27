"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCompactCurrency, formatDate } from "@/lib/format";
import { ContratoRow } from "@/lib/data";
import {
  createContrato,
  deleteContrato,
  updateContrato,
  StatusContratoValue,
} from "@/app/(dashboard)/contratos/actions";
import { NovoCliente } from "@/components/clientes/novo-cliente";
import { Plus, Trash2, MapPin, Calendar } from "lucide-react";

type Cliente = { id: string; name: string; city: string | null; country: string };

const statusOrder: StatusContratoValue[] = [
  "CONTRATO_ASSINADO",
  "PRE_EMBARQUE",
  "ESTUFAGEM_PORTO",
  "EMBARCADO",
  "CARGA_DESTINO",
  "CONTRATO_FINALIZADO",
];

const statusLabels: Record<StatusContratoValue, string> = {
  CONTRATO_ASSINADO: "Contrato assinado",
  PRE_EMBARQUE: "Pre embarque",
  ESTUFAGEM_PORTO: "Estufagem/Porto",
  EMBARCADO: "Embarcado",
  CARGA_DESTINO: "Carga no destino",
  CONTRATO_FINALIZADO: "Contrato finalizado",
};

const relevantDateField: Record<StatusContratoValue, "dataEstufagem" | "dataEmbarque" | "dataChegada"> = {
  CONTRATO_ASSINADO: "dataEstufagem",
  PRE_EMBARQUE: "dataEstufagem",
  ESTUFAGEM_PORTO: "dataEmbarque",
  EMBARCADO: "dataChegada",
  CARGA_DESTINO: "dataChegada",
  CONTRATO_FINALIZADO: "dataChegada",
};

const dateFieldLabels: Record<"dataEstufagem" | "dataEmbarque" | "dataChegada", string> = {
  dataEstufagem: "Estufagem",
  dataEmbarque: "Embarque",
  dataChegada: "Chegada",
};

function emptyForm(defaultClienteId: string) {
  return {
    contractNumber: "",
    clienteId: defaultClienteId,
    valorUsd: "",
    dataEstufagem: "",
    dataEmbarque: "",
    dataChegada: "",
    status: "CONTRATO_ASSINADO" as StatusContratoValue,
  };
}

function formFromRow(row: ContratoRow) {
  return {
    contractNumber: row.contractNumber,
    clienteId: row.clienteId,
    valorUsd: String(row.valorUsd),
    dataEstufagem: row.dataEstufagem ?? "",
    dataEmbarque: row.dataEmbarque ?? "",
    dataChegada: row.dataChegada ?? "",
    status: row.status as StatusContratoValue,
  };
}

export function ContratosKanban({
  clientes,
  contratos,
}: {
  clientes: Cliente[];
  contratos: ContratoRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(clientes[0]?.id ?? ""));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contratos.filter((c) => {
      if (clienteFilter !== "todos" && c.clienteId !== clienteFilter) return false;
      if (term) {
        const matches =
          c.contractNumber.toLowerCase().includes(term) || c.clienteName.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [contratos, clienteFilter, search]);

  const columns = useMemo(() => {
    return statusOrder.map((status) => ({
      status,
      items: filtered.filter((c) => c.status === status),
    }));
  }, [filtered]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(clientes[0]?.id ?? ""));
    setError(null);
    setOpen(true);
  }

  function openEdit(row: ContratoRow) {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.contractNumber.trim()) {
      setError("Informe o numero do contrato.");
      return;
    }
    if (!form.clienteId) {
      setError("Selecione o cliente.");
      return;
    }
    if (!(Number(form.valorUsd) > 0)) {
      setError("Informe o valor em US$ (maior que zero).");
      return;
    }
    setError(null);
    const payload = {
      contractNumber: form.contractNumber.trim(),
      clienteId: form.clienteId,
      valorUsd: Number(form.valorUsd) || 0,
      dataEstufagem: form.dataEstufagem,
      dataEmbarque: form.dataEmbarque,
      dataChegada: form.dataChegada,
      status: form.status,
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateContrato(editingId, payload);
        } else {
          await createContrato(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel salvar o contrato.");
      }
    });
  }

  function handleDelete() {
    if (!editingId) return;
    if (!window.confirm("Excluir este contrato de exportacao? Esta acao nao pode ser desfeita.")) return;
    startTransition(async () => {
      await deleteContrato(editingId);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por contrato ou cliente"
          className="w-64"
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto" onClick={openCreate}>
              <Plus size={16} />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar contrato" : "Cadastrar contrato de exportacao"}>
            <div className="space-y-3">
              <div>
                <Label>Numero do contrato</Label>
                <Input
                  value={form.contractNumber}
                  onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                  placeholder="Ex: EXP-2026-001"
                />
              </div>

              <div>
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.clienteId}
                    onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                  >
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <NovoCliente compact />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor US$</Label>
                  <Input
                    type="number"
                    value={form.valorUsd}
                    onChange={(e) => setForm({ ...form, valorUsd: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as StatusContratoValue })
                    }
                  >
                    {statusOrder.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Data de estufagem</Label>
                  <Input
                    type="date"
                    value={form.dataEstufagem}
                    onChange={(e) => setForm({ ...form, dataEstufagem: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data de embarque</Label>
                  <Input
                    type="date"
                    value={form.dataEmbarque}
                    onChange={(e) => setForm({ ...form, dataEmbarque: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data de chegada</Label>
                  <Input
                    type="date"
                    value={form.dataChegada}
                    onChange={(e) => setForm({ ...form, dataChegada: e.target.value })}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Salvar alteracoes" : "Salvar contrato"}
              </Button>
              {editingId && (
                <Button
                  variant="outline"
                  className="w-full text-danger"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  <Trash2 size={14} />
                  Excluir contrato
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((column) => (
          <div key={column.status} className="w-72 shrink-0 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">{statusLabels[column.status]}</h3>
              <Badge variant="neutral">{column.items.length}</Badge>
            </div>
            <div className="space-y-3">
              {column.items.map((row) => {
                const dateField = relevantDateField[row.status];
                const dateValue = row[dateField];
                return (
                  <Card
                    key={row.id}
                    className="cursor-pointer p-3 hover:border-primary"
                    onClick={() => openEdit(row)}
                  >
                    <p className="font-semibold">{row.contractNumber}</p>
                    <p className="text-sm">{row.clienteName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <MapPin size={12} />
                      {row.clienteCountry}
                    </p>
                    <p className="mt-2 text-sm font-medium text-primary">
                      {formatCompactCurrency(row.valorUsd, "USD")}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Calendar size={12} />
                      {dateValue
                        ? `${dateFieldLabels[dateField]}: ${formatDate(dateValue)}`
                        : `${dateFieldLabels[dateField]}: sem data`}
                    </p>
                  </Card>
                );
              })}
              {column.items.length === 0 && (
                <p className="px-1 text-xs text-muted">Nenhum contrato nesta etapa.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
