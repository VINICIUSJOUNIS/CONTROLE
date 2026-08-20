"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
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
import { Plus, Pencil, Trash2, Wallet, PiggyBank, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";

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

export function ContaGarantidaView({
  banks,
  initialContas,
}: {
  banks: Bank[];
  initialContas: ContaGarantidaRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(banks[0]?.id ?? ""));

  const [openUso, setOpenUso] = useState(false);
  const [editingUsoId, setEditingUsoId] = useState<string | null>(null);
  const [errorUso, setErrorUso] = useState<string | null>(null);
  const [formUso, setFormUso] = useState(emptyUsoForm(""));

  const totais = useMemo(() => {
    return initialContas.reduce(
      (acc, c) => ({
        limite: acc.limite + c.limiteContratado,
        utilizado: acc.utilizado + c.valorUtilizado,
        disponivel: acc.disponivel + c.valorDisponivel,
        aPagar: acc.aPagar + c.valorAPagarPeriodo,
      }),
      { limite: 0, utilizado: 0, disponivel: 0, aPagar: 0 }
    );
  }, [initialContas]);

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

  return (
    <div className="space-y-4">
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
      </div>

      <div className="flex justify-end">
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
              {initialContas.map((c) => {
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
                              Nenhuma utilização registrada ainda para este banco.
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
              {initialContas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Nenhuma conta garantida cadastrada ainda.
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
