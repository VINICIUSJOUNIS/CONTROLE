"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { ContaGarantidaRow } from "@/lib/data";
import {
  createContaGarantida,
  deleteContaGarantida,
  updateContaGarantida,
  ContaGarantidaFormInput,
} from "@/app/(dashboard)/conta-garantida/actions";
import { NovoBanco } from "@/components/bancos/novo-banco";
import { Plus, Pencil, Trash2, Wallet, PiggyBank, TrendingUp } from "lucide-react";

type Bank = { id: string; name: string; color: string };

function emptyForm(defaultBankId: string) {
  return {
    bankId: defaultBankId,
    limiteContratado: "",
    valorUtilizado: "",
    taxaJurosPercent: "",
    iofPercent: "",
    iofAdicionalPercent: "",
    observacao: "",
  };
}

function formFromRow(conta: ContaGarantidaRow) {
  return {
    bankId: conta.bankId,
    limiteContratado: String(conta.limiteContratado),
    valorUtilizado: String(conta.valorUtilizado),
    taxaJurosPercent: String(conta.taxaJurosPercent),
    iofPercent: String(conta.iofPercent),
    iofAdicionalPercent: String(conta.iofAdicionalPercent),
    observacao: conta.observacao ?? "",
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
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(banks[0]?.id ?? ""));

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
    setForm(formFromRow(conta));
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
      valorUtilizado: Number(form.valorUtilizado) || 0,
      taxaJurosPercent: Number(form.taxaJurosPercent) || 0,
      iofPercent: Number(form.iofPercent) || 0,
      iofAdicionalPercent: Number(form.iofAdicionalPercent) || 0,
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
    if (!window.confirm(`Excluir a conta garantida do ${conta.bankName}? Esta acao nao pode ser desfeita.`))
      return;
    startTransition(async () => {
      await deleteContaGarantida(conta.id);
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
                  <Label>Valor Utilizado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valorUtilizado}
                    onChange={(e) => setForm({ ...form, valorUtilizado: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Taxa de Juros (% a.m.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.taxaJurosPercent}
                    onChange={(e) => setForm({ ...form, taxaJurosPercent: e.target.value })}
                  />
                </div>
                <div>
                  <Label>IOF (%)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.iofPercent}
                    onChange={(e) => setForm({ ...form, iofPercent: e.target.value })}
                  />
                </div>
                <div>
                  <Label>IOF Adicional (%)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.iofAdicionalPercent}
                    onChange={(e) => setForm({ ...form, iofAdicionalPercent: e.target.value })}
                  />
                </div>
              </div>

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
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Limite Contratado</th>
                <th className="px-4 py-3 font-medium">Valor Utilizado</th>
                <th className="px-4 py-3 font-medium">Valor Disponível</th>
                <th className="px-4 py-3 font-medium">Taxa</th>
                <th className="px-4 py-3 font-medium">IOF</th>
                <th className="px-4 py-3 font-medium">IOF Adicional</th>
                <th className="px-4 py-3 font-medium">Valor a Pagar no Período</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {initialContas.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{c.bankName}</td>
                  <td className="px-4 py-2.5">{formatCurrency(c.limiteContratado)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(c.valorUtilizado)}</td>
                  <td className="px-4 py-2.5">{formatCurrency(c.valorDisponivel)}</td>
                  <td className="px-4 py-2.5">{formatPercent(c.taxaJurosPercent)} a.m.</td>
                  <td className="px-4 py-2.5">{formatPercent(c.iofPercent, 4)}</td>
                  <td className="px-4 py-2.5">{formatPercent(c.iofAdicionalPercent, 4)}</td>
                  <td className="px-4 py-2.5 font-medium">{formatCurrency(c.valorAPagarPeriodo)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
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
              ))}
              {initialContas.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    Nenhuma conta garantida cadastrada ainda.
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
