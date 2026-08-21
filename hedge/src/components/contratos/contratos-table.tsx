"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { ContratoRow } from "@/lib/data";
import {
  createContrato,
  deleteContrato,
  updateContrato,
  StatusContratoValue,
  DespesasContratoInput,
  RecebimentoContratoInput,
} from "@/app/(dashboard)/contratos/actions";
import { NovoCliente } from "@/components/clientes/novo-cliente";
import { NovaCorretora } from "@/components/corretoras/nova-corretora";
import {
  Cliente,
  Corretora,
  statusOrder,
  statusLabels,
  despesaLabels,
  despesaKeys,
  emptyDespesasForm,
  recebimentoLabels,
  emptyRecebimentoForm,
} from "@/lib/contrato-shared";

const recebimentoKeys = Object.keys(recebimentoLabels) as (keyof typeof recebimentoLabels)[];
import { Plus, Trash2, Pencil } from "lucide-react";

function emptyForm(defaultClienteId: string, defaultCountry: string) {
  return {
    contractNumber: "",
    clienteId: defaultClienteId,
    corretoraId: "",
    country: defaultCountry,
    valorUsd: "",
    dataEstufagem: "",
    dataEmbarque: "",
    dataChegada: "",
    status: "CONFIRMACAO_NEGOCIO" as StatusContratoValue,
    despesas: emptyDespesasForm(),
    recebimento: emptyRecebimentoForm(),
  };
}

function formFromRow(row: ContratoRow) {
  return {
    contractNumber: row.contractNumber,
    clienteId: row.clienteId,
    corretoraId: row.corretoraId ?? "",
    country: row.country,
    valorUsd: String(row.valorUsd),
    dataEstufagem: row.dataEstufagem ?? "",
    dataEmbarque: row.dataEmbarque ?? "",
    dataChegada: row.dataChegada ?? "",
    status: row.status as StatusContratoValue,
    despesas: Object.fromEntries(
      despesaKeys.map((k) => [k, String(row.despesas[k])])
    ) as Record<keyof DespesasContratoInput, string>,
    recebimento: {
      quantSacas: row.quantSacas != null ? String(row.quantSacas) : "",
      adiantamentoUsd: String(row.adiantamentoUsd),
      dataAdiantamento: row.dataAdiantamento ?? "",
      financiadoPelaRts: String(row.financiadoPelaRts),
      valorFinanciadoRtsUsd: String(row.valorFinanciadoRtsUsd),
      dataLiberacaoFinanciamentoRts: row.dataLiberacaoFinanciamentoRts ?? "",
      previsaoPagamentoCliente: row.previsaoPagamentoCliente ?? "",
      saldoAReceberRtsUsd: String(row.saldoAReceberRtsUsd),
      valorRecebidoRtsUsd: String(row.valorRecebidoRtsUsd),
      dataRecebimentoRts: row.dataRecebimentoRts ?? "",
      obsRecebimento: row.obsRecebimento ?? "",
    } as Record<keyof RecebimentoContratoInput, string>,
  };
}

export function ContratosTable({
  clientes,
  contratos,
  corretoras,
}: {
  clientes: Cliente[];
  contratos: ContratoRow[];
  corretoras: Corretora[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clienteFilter, setClienteFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(clientes[0]?.id ?? "", clientes[0]?.country ?? ""));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contratos.filter((c) => {
      if (clienteFilter !== "todos" && c.clienteId !== clienteFilter) return false;
      if (statusFilter !== "todos" && c.status !== statusFilter) return false;
      if (term) {
        const matches =
          c.contractNumber.toLowerCase().includes(term) || c.clienteName.toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [contratos, clienteFilter, statusFilter, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(clientes[0]?.id ?? "", clientes[0]?.country ?? ""));
    setError(null);
    setOpen(true);
  }

  function openEdit(row: ContratoRow) {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setError(null);
    setOpen(true);
  }

  function handleClienteChange(clienteId: string) {
    const cliente = clientes.find((c) => c.id === clienteId);
    setForm({ ...form, clienteId, country: cliente?.country ?? form.country });
  }

  function handleDespesaChange(key: keyof DespesasContratoInput, value: string) {
    setForm({ ...form, despesas: { ...form.despesas, [key]: value } });
  }

  function handleRecebimentoChange(key: keyof RecebimentoContratoInput, value: string) {
    setForm({ ...form, recebimento: { ...form.recebimento, [key]: value } });
  }

  const totalDespesas = despesaKeys.reduce((sum, k) => sum + (Number(form.despesas[k]) || 0), 0);

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
    const despesasPayload = Object.fromEntries(
      despesaKeys.map((k) => [k, Number(form.despesas[k]) || 0])
    ) as DespesasContratoInput;
    const recebimentoPayload: RecebimentoContratoInput = {
      quantSacas: form.recebimento.quantSacas ? Number(form.recebimento.quantSacas) : null,
      adiantamentoUsd: Number(form.recebimento.adiantamentoUsd) || 0,
      dataAdiantamento: form.recebimento.dataAdiantamento,
      financiadoPelaRts: form.recebimento.financiadoPelaRts === "true",
      valorFinanciadoRtsUsd: Number(form.recebimento.valorFinanciadoRtsUsd) || 0,
      dataLiberacaoFinanciamentoRts: form.recebimento.dataLiberacaoFinanciamentoRts,
      previsaoPagamentoCliente: form.recebimento.previsaoPagamentoCliente,
      saldoAReceberRtsUsd: Number(form.recebimento.saldoAReceberRtsUsd) || 0,
      valorRecebidoRtsUsd: Number(form.recebimento.valorRecebidoRtsUsd) || 0,
      dataRecebimentoRts: form.recebimento.dataRecebimentoRts,
      obsRecebimento: form.recebimento.obsRecebimento.trim(),
    };
    const payload = {
      contractNumber: form.contractNumber.trim(),
      clienteId: form.clienteId,
      corretoraId: form.corretoraId || null,
      country: form.country.trim(),
      valorUsd: Number(form.valorUsd) || 0,
      dataEstufagem: form.dataEstufagem,
      dataEmbarque: form.dataEmbarque,
      dataChegada: form.dataChegada,
      status: form.status,
      despesas: despesasPayload,
      recebimento: recebimentoPayload,
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
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="todos">Todas as etapas</option>
          {statusOrder.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
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
                  <Select value={form.clienteId} onChange={(e) => handleClienteChange(e.target.value)}>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <NovoCliente compact />
                </div>
              </div>

              <div>
                <Label>Corretor</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.corretoraId}
                    onChange={(e) => setForm({ ...form, corretoraId: e.target.value })}
                  >
                    <option value="">Sem corretor definido</option>
                    {corretoras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <NovaCorretora compact />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pais</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Ex: Estados Unidos"
                  />
                </div>
                <div>
                  <Label>Valor US$</Label>
                  <Input
                    type="number"
                    value={form.valorUsd}
                    onChange={(e) => setForm({ ...form, valorUsd: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StatusContratoValue })}
                >
                  {statusOrder.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </Select>
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

              <div className="rounded-lg border border-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Despesas do contrato (R$)</p>
                  <p className="text-sm font-semibold text-primary">{formatCurrency(totalDespesas)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {despesaKeys.map((key) => (
                    <div key={key}>
                      <Label>{despesaLabels[key]}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.despesas[key]}
                        onChange={(e) => handleDespesaChange(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Recebimento (US$)</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.recebimento.financiadoPelaRts === "true"}
                      onChange={(e) =>
                        handleRecebimentoChange("financiadoPelaRts", String(e.target.checked))
                      }
                    />
                    Financiado pela RTS
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {recebimentoKeys.map((key) => (
                    <div key={key}>
                      <Label>{recebimentoLabels[key]}</Label>
                      <Input
                        type={key.toLowerCase().startsWith("data") || key === "previsaoPagamentoCliente" ? "date" : "number"}
                        step="0.01"
                        value={form.recebimento[key]}
                        onChange={(e) => handleRecebimentoChange(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Label>Observacao do recebimento</Label>
                  <Input
                    value={form.recebimento.obsRecebimento}
                    onChange={(e) => handleRecebimentoChange("obsRecebimento", e.target.value)}
                    placeholder="Ex: Aguardando BL"
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

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full whitespace-nowrap text-xs">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Corretor</th>
                <th className="px-4 py-3 font-medium">Pais</th>
                <th className="px-4 py-3 font-medium">Valor US$</th>
                <th className="px-4 py-3 font-medium">Saldo a receber US$</th>
                <th className="px-4 py-3 font-medium">Recebido US$</th>
                <th className="px-4 py-3 font-medium">Despesas (R$)</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Estufagem</th>
                <th className="px-4 py-3 font-medium">Embarque</th>
                <th className="px-4 py-3 font-medium">Chegada</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{row.contractNumber}</td>
                  <td className="px-4 py-2.5">{row.clienteName}</td>
                  <td className="px-4 py-2.5">{row.corretoraName ?? <span className="text-muted">-</span>}</td>
                  <td className="px-4 py-2.5">{row.country || <span className="text-muted">-</span>}</td>
                  <td className="px-4 py-2.5">{formatCompactCurrency(row.valorUsd, "USD")}</td>
                  <td className="px-4 py-2.5">
                    {row.saldoAReceberRtsUsd > 0 ? (
                      formatCompactCurrency(row.saldoAReceberRtsUsd, "USD")
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.valorRecebidoRtsUsd > 0 ? (
                      formatCompactCurrency(row.valorRecebidoRtsUsd, "USD")
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.custoTotalDespesas > 0 ? (
                      formatCompactCurrency(row.custoTotalDespesas)
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={row.status === "LIBERACAO_CARGA" ? "success" : "neutral"}>
                      {statusLabels[row.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    {row.dataEstufagem ? formatDate(row.dataEstufagem) : <span className="text-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.dataEmbarque ? formatDate(row.dataEmbarque) : <span className="text-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.dataChegada ? formatDate(row.dataChegada) : <span className="text-muted">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => openEdit(row)}
                      className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-6 text-center text-muted">
                    Nenhum contrato encontrado.
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
