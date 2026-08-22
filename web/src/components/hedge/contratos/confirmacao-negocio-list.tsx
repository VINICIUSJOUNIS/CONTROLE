"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { ContratoRow, ConfirmacaoNegocioData } from "@/lib/hedge-data";
import { upsertConfirmacaoNegocio, ConfirmacaoNegocioInput } from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import { Cliente, Corretora } from "@/lib/contrato-shared";
import { Pencil, MapPin } from "lucide-react";

function emptyForm(): ConfirmacaoNegocioInput {
  return {
    dataConfirmacao: "",
    numeroContrato: "",
    corretoraId: "",
    clienteId: "",
    valorUsd: 0,
    frete: 0,
    tipoEmbalagem: "",
    quantidadeSacas: null,
    descricaoCafe: "",
    previsaoEmbarque: "",
    destinoCarga: "",
    formaPagamento: "",
  };
}

function formFromData(data: ConfirmacaoNegocioData): ConfirmacaoNegocioInput {
  return {
    dataConfirmacao: data.dataConfirmacao ?? "",
    numeroContrato: data.numeroContrato ?? "",
    corretoraId: data.corretoraId ?? "",
    clienteId: data.clienteId ?? "",
    valorUsd: data.valorUsd ?? 0,
    frete: data.frete ?? 0,
    tipoEmbalagem: data.tipoEmbalagem ?? "",
    quantidadeSacas: data.quantidadeSacas,
    descricaoCafe: data.descricaoCafe ?? "",
    previsaoEmbarque: data.previsaoEmbarque ?? "",
    destinoCarga: data.destinoCarga ?? "",
    formaPagamento: data.formaPagamento ?? "",
  };
}

export function ConfirmacaoNegocioList({
  contratos,
  confirmacoes,
  clientes,
  corretoras,
}: {
  contratos: ContratoRow[];
  confirmacoes: Record<string, ConfirmacaoNegocioData>;
  clientes: Cliente[];
  corretoras: Corretora[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingContratoId, setEditingContratoId] = useState<string | null>(null);
  const [form, setForm] = useState<ConfirmacaoNegocioInput>(emptyForm());

  function openEdit(contratoId: string) {
    const existing = confirmacoes[contratoId];
    setEditingContratoId(contratoId);
    setForm(existing ? formFromData(existing) : emptyForm());
    setOpen(true);
  }

  function handleSave() {
    if (!editingContratoId) return;
    startTransition(async () => {
      await upsertConfirmacaoNegocio(editingContratoId, form);
      setOpen(false);
      router.refresh();
    });
  }

  if (contratos.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted">Nenhum contrato nesta etapa.</Card>;
  }

  return (
    <>
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
                  {dados.frete != null && dados.frete > 0 && <p>Frete: {formatCurrency(dados.frete)}</p>}
                  {dados.tipoEmbalagem && <p>Embalagem: {dados.tipoEmbalagem}</p>}
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
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Confirmação de Negócio">
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
                <Select value={form.corretoraId} onChange={(e) => setForm({ ...form, corretoraId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {corretoras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
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
                <Label>Frete (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.frete}
                  onChange={(e) => setForm({ ...form, frete: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Embalagem</Label>
                <Input
                  value={form.tipoEmbalagem}
                  onChange={(e) => setForm({ ...form, tipoEmbalagem: e.target.value })}
                  placeholder="Ex: Saca 60kg"
                />
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
                <Input
                  value={form.destinoCarga}
                  onChange={(e) => setForm({ ...form, destinoCarga: e.target.value })}
                />
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

            <Button className="w-full" onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
