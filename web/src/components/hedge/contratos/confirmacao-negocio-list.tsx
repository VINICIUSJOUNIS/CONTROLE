"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { ContratoRow, ConfirmacaoNegocioData } from "@/lib/hedge-data";
import {
  upsertConfirmacaoNegocio,
  createContratoComConfirmacao,
  ConfirmacaoNegocioInput,
} from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import { Cliente, Corretora, statusOrder } from "@/lib/contrato-shared";
import { COUNTRIES } from "@/lib/countries";
import { updateContratoStatus, StatusContratoValue } from "@/app/(dashboard)/hedge/contratos/actions";
import { NovoCliente } from "@/components/hedge/clientes/novo-cliente";
import { NovaCorretora } from "@/components/hedge/corretoras/nova-corretora";
import { NovoTipoEmbalagem } from "@/components/hedge/contratos/novo-tipo-embalagem";
import { Pencil, MapPin, Plus, ChevronLeft, ChevronRight } from "lucide-react";

function emptyForm(): ConfirmacaoNegocioInput {
  return {
    dataConfirmacao: "",
    numeroContrato: "",
    corretoraId: "",
    clienteId: "",
    valorUsd: 0,
    frete: "",
    tipoEmbalagemId: "",
    quantidadeSacas: null,
    descricaoCafe: "",
    previsaoEmbarque: "",
    destinoCarga: "",
    formaPagamento: "",
    diferencial: "",
    fixacaoTipo: "",
    dataFixacao: "",
    nivelBolsa: "",
    valorDolar: "",
  };
}

function formFromData(data: ConfirmacaoNegocioData): ConfirmacaoNegocioInput {
  return {
    dataConfirmacao: data.dataConfirmacao ?? "",
    numeroContrato: data.numeroContrato ?? "",
    corretoraId: data.corretoraId ?? "",
    clienteId: data.clienteId ?? "",
    valorUsd: data.valorUsd ?? 0,
    frete: data.frete ?? "",
    tipoEmbalagemId: data.tipoEmbalagemId ?? "",
    quantidadeSacas: data.quantidadeSacas,
    descricaoCafe: data.descricaoCafe ?? "",
    previsaoEmbarque: data.previsaoEmbarque ?? "",
    destinoCarga: data.destinoCarga ?? "",
    formaPagamento: data.formaPagamento ?? "",
    diferencial: data.diferencial != null ? String(data.diferencial) : "",
    fixacaoTipo: data.fixacaoTipo ?? "",
    dataFixacao: data.dataFixacao ?? "",
    nivelBolsa: data.nivelBolsa != null ? String(data.nivelBolsa) : "",
    valorDolar: data.valorDolar != null ? String(data.valorDolar) : "",
  };
}

export function ConfirmacaoNegocioList({
  contratos,
  confirmacoes,
  clientes,
  corretoras,
  tiposEmbalagem,
}: {
  contratos: ContratoRow[];
  confirmacoes: Record<string, ConfirmacaoNegocioData>;
  clientes: Cliente[];
  corretoras: Corretora[];
  tiposEmbalagem: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingContratoId, setEditingContratoId] = useState<string | null>(null);
  const [form, setForm] = useState<ConfirmacaoNegocioInput>(emptyForm());
  const [error, setError] = useState<string | null>(null);

  function openEdit(contratoId: string) {
    const existing = confirmacoes[contratoId];
    setEditingContratoId(contratoId);
    setForm(existing ? formFromData(existing) : emptyForm());
    setError(null);
    setOpen(true);
  }

  function openCreate() {
    setEditingContratoId(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function moveStatus(id: string, direction: -1 | 1) {
    const current = contratos.find((c) => c.id === id);
    if (!current) return;
    const currentIndex = statusOrder.indexOf(current.status as StatusContratoValue);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= statusOrder.length) return;
    const nextStatus = statusOrder[nextIndex];
    startTransition(async () => {
      await updateContratoStatus(id, nextStatus);
      router.refresh();
    });
  }

  function handleSave() {
    if (!editingContratoId && !form.numeroContrato.trim()) {
      setError("Informe o numero do contrato.");
      return;
    }
    if (!editingContratoId && !form.clienteId) {
      setError("Selecione o cliente.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        if (editingContratoId) {
          await upsertConfirmacaoNegocio(editingContratoId, form);
        } else {
          await createContratoComConfirmacao(form);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel salvar. Confira se o numero do contrato ja nao esta em uso.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Button onClick={openCreate}>
        <Plus size={16} />
        Novo Contrato
      </Button>

      {contratos.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted">Nenhum contrato nesta etapa ainda.</Card>
      )}

      <div className="flex flex-wrap gap-3">
        {contratos.map((item) => {
          const dados = confirmacoes[item.id];
          return (
            <div key={item.id} className="w-72 shrink-0 rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.contractNumber}</p>
                  <p className="text-sm">{item.clienteName}</p>
                </div>
                <button
                  onClick={() => openEdit(item.id)}
                  className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                  title="Preencher confirmação de negócio"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <MapPin size={12} />
                {item.country}
              </p>
              <p className="mt-2 text-sm font-medium text-primary">
                {formatCompactCurrency(item.valorUsd, "USD")}
              </p>

              {dados ? (
                <div className="mt-3 space-y-1 border-t border-border pt-2 text-xs text-muted">
                  <p>
                    Confirmado em: {dados.dataConfirmacao ? formatDate(dados.dataConfirmacao) : "-"}
                  </p>
                  {dados.numeroContrato && <p>Contrato: {dados.numeroContrato}</p>}
                  {dados.corretoraName && <p>Broker: {dados.corretoraName}</p>}
                  {dados.valorUsd != null && <p>Valor: {formatCurrency(dados.valorUsd, "USD")}</p>}
                  {dados.diferencial != null && (
                    <p>
                      Diferencial:{" "}
                      <span className={dados.diferencial < 0 ? "text-danger" : undefined}>
                        {dados.diferencial >= 0 ? "+" : ""}
                        {dados.diferencial.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                  )}
                  {dados.frete && <p>Frete: {dados.frete}</p>}
                  {dados.fixacaoTipo && <p>Fixação: {dados.fixacaoTipo === "BUYER" ? "Buyer" : "Seller"}</p>}
                  {dados.dataFixacao && <p>Data da fixação: {formatDate(dados.dataFixacao)}</p>}
                  {dados.nivelBolsa != null && <p>Nível de bolsa: {dados.nivelBolsa}</p>}
                  {dados.valorDolar != null && <p>Valor do dólar: {dados.valorDolar}</p>}
                  {dados.tipoEmbalagemNome && <p>Embalagem: {dados.tipoEmbalagemNome}</p>}
                  {dados.quantidadeSacas != null && <p>Quantidade: {dados.quantidadeSacas} sacas</p>}
                  {dados.descricaoCafe && <p>Café: {dados.descricaoCafe}</p>}
                  {dados.previsaoEmbarque && <p>Previsão embarque: {formatDate(dados.previsaoEmbarque)}</p>}
                  {dados.destinoCarga && <p>Destino: {dados.destinoCarga}</p>}
                  {dados.formaPagamento && <p>Pagamento: {dados.formaPagamento}</p>}
                </div>
              ) : (
                <p className="mt-3 border-t border-border pt-2 text-xs text-muted">
                  Confirmação de negócio ainda não preenchida.
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                {(() => {
                  const idx = statusOrder.indexOf(item.status as StatusContratoValue);
                  return (
                    <>
                      <button
                        onClick={() => moveStatus(item.id, -1)}
                        disabled={isPending || idx === 0}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ChevronLeft size={14} />
                        Voltar
                      </button>
                      <button
                        onClick={() => moveStatus(item.id, 1)}
                        disabled={isPending || idx === statusOrder.length - 1}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-30"
                      >
                        Avançar
                        <ChevronRight size={14} />
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={editingContratoId ? "Confirmação de Negócio" : "Novo Contrato — Confirmação de Negócio"}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data da Confirmação</Label>
                <Input
                  type="date"
                  value={form.dataConfirmacao}
                  onChange={(e) => setForm({ ...form, dataConfirmacao: e.target.value })}
                />
              </div>
              <div>
                <Label>Contrato</Label>
                <Input
                  value={form.numeroContrato}
                  onChange={(e) => setForm({ ...form, numeroContrato: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Broker</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.corretoraId}
                    onChange={(e) => setForm({ ...form, corretoraId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {corretoras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <NovaCorretora compact />
                </div>
              </div>
              <div>
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
                    <option value="">Selecione...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <NovoCliente compact />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (US$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valorUsd}
                  onChange={(e) => setForm({ ...form, valorUsd: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Diferencial</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.diferencial}
                  onChange={(e) => setForm({ ...form, diferencial: e.target.value })}
                  placeholder="Ex: -5,00 ou 10,00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frete</Label>
                <Select value={form.frete} onChange={(e) => setForm({ ...form, frete: e.target.value })}>
                  <option value="">Selecione...</option>
                  <option value="FOB">FOB</option>
                  <option value="CIF">CIF</option>
                </Select>
              </div>
              <div>
                <Label>Fixação do Contrato</Label>
                <Select
                  value={form.fixacaoTipo}
                  onChange={(e) => setForm({ ...form, fixacaoTipo: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  <option value="BUYER">Buyer</option>
                  <option value="SELLER">Seller</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Data da Fixação</Label>
                <Input
                  type="date"
                  value={form.dataFixacao}
                  onChange={(e) => setForm({ ...form, dataFixacao: e.target.value })}
                />
              </div>
              <div>
                <Label>Nível de Bolsa</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.nivelBolsa}
                  onChange={(e) => setForm({ ...form, nivelBolsa: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor do Dólar</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.valorDolar}
                  onChange={(e) => setForm({ ...form, valorDolar: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Embalagem</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.tipoEmbalagemId}
                    onChange={(e) => setForm({ ...form, tipoEmbalagemId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {tiposEmbalagem.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  <NovoTipoEmbalagem compact />
                </div>
              </div>
              <div>
                <Label>Quantidade (sacas)</Label>
                <Input
                  type="number"
                  value={form.quantidadeSacas ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, quantidadeSacas: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Descrição do Café</Label>
              <Input
                value={form.descricaoCafe}
                onChange={(e) => setForm({ ...form, descricaoCafe: e.target.value })}
                placeholder="Ex: Arábica tipo 6, bica corrida"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Previsão de Embarque</Label>
                <Input
                  type="date"
                  value={form.previsaoEmbarque}
                  onChange={(e) => setForm({ ...form, previsaoEmbarque: e.target.value })}
                />
              </div>
              <div>
                <Label>Destino da Carga</Label>
                <Select
                  value={form.destinoCarga}
                  onChange={(e) => setForm({ ...form, destinoCarga: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.id} value={c.labelPt}>
                      {c.labelPt}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <Input
                value={form.formaPagamento}
                onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}
                placeholder="Ex: Carta de crédito, 30/60/90 dias"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            <Button className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
