"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { ContratoRow, ConfirmacaoNegocioData, ContratoAnexoData } from "@/lib/hedge-data";
import {
  upsertConfirmacaoNegocio,
  createContratoComConfirmacao,
  ConfirmacaoNegocioInput,
} from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import { Cliente, Corretora, statusOrder, EtapaStatusValue } from "@/lib/contrato-shared";
import { COUNTRIES } from "@/lib/countries";
import { updateContratoStatus, StatusContratoValue } from "@/app/(dashboard)/hedge/contratos/actions";
import { NovoCliente } from "@/components/hedge/clientes/novo-cliente";
import { NovaCorretora } from "@/components/hedge/corretoras/nova-corretora";
import { NovoTipoFrete } from "@/components/hedge/contratos/novo-tipo-frete";
import { NovoTipoEmbalagem } from "@/components/hedge/contratos/novo-tipo-embalagem";
import { NovaFormaPagamento } from "@/components/hedge/contratos/nova-forma-pagamento";
import { NovaPeneira } from "@/components/hedge/contratos/nova-peneira";
import { NovoPadraoCafe } from "@/components/hedge/contratos/novo-padrao-cafe";
import { PrevisaoEtapa, EtapaStatusSelect, Checklist } from "@/components/hedge/contratos/etapa-contratos-list";
import { AnexosSection } from "@/components/hedge/contratos/anexos-section";
import { alertaPrazo } from "@/lib/prazo";
import {
  Pencil,
  MapPin,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Paperclip,
  Calendar,
} from "lucide-react";

function emptyForm(): ConfirmacaoNegocioInput {
  return {
    dataConfirmacao: "",
    numeroContrato: "",
    numeroContratoInterno: "",
    corretoraId: "",
    clienteId: "",
    valorUsd: 0,
    dataInicioContrato: "",
    dataEstufagem: "",
    dataEmbarque: "",
    dataChegada: "",
    tipoFreteId: "",
    tipoEmbalagemId: "",
    quantidadeSacas: null,
    peneiraId: "",
    padraoId: "",
    previsaoEmbarque: "",
    destinoCarga: "",
    formaPagamentoId: "",
    diferencial: "",
    fixacaoTipo: "",
    dataFixacao: "",
    nivelBolsa: "",
    valorDolar: "",
  };
}

function formFromData(data: ConfirmacaoNegocioData, contrato: ContratoRow | undefined): ConfirmacaoNegocioInput {
  return {
    dataConfirmacao: data.dataConfirmacao ?? "",
    numeroContrato: data.numeroContrato ?? "",
    numeroContratoInterno: data.numeroContratoInterno ?? "",
    corretoraId: data.corretoraId ?? "",
    clienteId: data.clienteId ?? "",
    valorUsd: data.valorUsd ?? 0,
    dataInicioContrato: contrato?.dataInicioContrato ?? "",
    dataEstufagem: contrato?.dataEstufagem ?? "",
    dataEmbarque: contrato?.dataEmbarque ?? "",
    dataChegada: contrato?.dataChegada ?? "",
    tipoFreteId: data.tipoFreteId ?? "",
    tipoEmbalagemId: data.tipoEmbalagemId ?? "",
    quantidadeSacas: data.quantidadeSacas,
    peneiraId: data.peneiraId ?? "",
    padraoId: data.padraoId ?? "",
    previsaoEmbarque: data.previsaoEmbarque ?? "",
    destinoCarga: data.destinoCarga ?? "",
    formaPagamentoId: data.formaPagamentoId ?? "",
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
  tiposFrete,
  tiposEmbalagem,
  formasPagamento,
  peneiras,
  padroesCafe,
  statusEtapas,
  checklist,
  previsoes,
  anexos,
}: {
  contratos: ContratoRow[];
  confirmacoes: Record<string, ConfirmacaoNegocioData>;
  clientes: Cliente[];
  corretoras: Corretora[];
  tiposFrete: { id: string; name: string }[];
  tiposEmbalagem: { id: string; name: string }[];
  formasPagamento: { id: string; name: string }[];
  peneiras: { id: string; name: string }[];
  padroesCafe: { id: string; name: string }[];
  statusEtapas: Record<string, EtapaStatusValue>;
  checklist: Record<string, Partial<Record<StatusContratoValue, EtapaStatusValue>>>;
  previsoes: Record<string, string>;
  anexos: Record<string, ContratoAnexoData[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoParam = searchParams.get("contrato");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingContratoId, setEditingContratoId] = useState<string | null>(null);
  const [form, setForm] = useState<ConfirmacaoNegocioInput>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(contratoParam);

  // Valor (US$) e sempre calculado a partir do nivel de bolsa, diferencial e
  // quantidade de sacas informados, em vez de digitado manualmente.
  const calculatedValorUsd =
    ((Number(form.nivelBolsa) || 0) + (Number(form.diferencial) || 0)) *
    1.3228 *
    (form.quantidadeSacas ?? 0);

  useEffect(() => {
    if (contratoParam) {
      document.getElementById(`contrato-${contratoParam}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(contratoId: string) {
    const existing = confirmacoes[contratoId];
    const contrato = contratos.find((c) => c.id === contratoId);
    setEditingContratoId(contratoId);
    if (existing) {
      setForm(formFromData(existing, contrato));
    } else {
      setForm({
        ...emptyForm(),
        dataInicioContrato: contrato?.dataInicioContrato ?? "",
        dataEstufagem: contrato?.dataEstufagem ?? "",
        dataEmbarque: contrato?.dataEmbarque ?? "",
        dataChegada: contrato?.dataChegada ?? "",
      });
    }
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
    const payload = { ...form, valorUsd: calculatedValorUsd };
    startTransition(async () => {
      try {
        if (editingContratoId) {
          await upsertConfirmacaoNegocio(editingContratoId, payload);
        } else {
          await createContratoComConfirmacao(payload);
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

      <div className="space-y-2">
        {contratos.map((item) => {
          const dados = confirmacoes[item.id];
          const isExpanded = expandedId === item.id;
          const idx = statusOrder.indexOf(item.status as StatusContratoValue);
          return (
            <Card key={item.id} id={`contrato-${item.id}`} className="overflow-hidden p-0">
              <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-3">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex min-w-0 flex-1 items-center gap-x-4 gap-y-1 text-left"
                >
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.contractNumber}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      {item.clienteName}
                      <MapPin size={11} className="ml-1" />
                      {item.country}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-primary">
                    {formatCompactCurrency(item.valorUsd, "USD")}
                  </p>
                  <p className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <Calendar size={12} />
                    Estufagem: {item.dataEstufagem ? formatDate(item.dataEstufagem) : "sem data"}
                  </p>
                  <p className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <Calendar size={12} />
                    Embarque: {item.dataEmbarque ? formatDate(item.dataEmbarque) : "sem data"}
                  </p>
                  <p className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <Calendar size={12} />
                    Chegada do navio: {item.dataChegada ? formatDate(item.dataChegada) : "sem data"}
                  </p>
                  {!dados && (
                    <p className="shrink-0 text-xs text-muted">Confirmação ainda não preenchida</p>
                  )}
                  {(anexos[item.id]?.length ?? 0) > 0 && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                      <Paperclip size={12} />
                      {anexos[item.id]!.length}
                    </span>
                  )}
                  {(() => {
                    const previsao = previsoes[item.id];
                    const finalizado = statusEtapas[item.id] === "FINALIZADO";
                    const alerta = previsao && !finalizado ? alertaPrazo(previsao) : null;
                    if (!alerta) return null;
                    return (
                      <span
                        className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
                          alerta.tone === "danger" ? "text-danger" : "text-warning"
                        }`}
                      >
                        <AlertTriangle size={12} />
                        {alerta.label}
                      </span>
                    );
                  })()}
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(item.id);
                    }}
                    className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                    title="Preencher confirmação de negócio"
                  >
                    <Pencil size={14} />
                  </button>
                  <EtapaStatusSelect
                    contratoId={item.id}
                    status="CONFIRMACAO_NEGOCIO"
                    value={statusEtapas[item.id] ?? "NAO_INICIADO"}
                  />
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
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-3">
                  {dados ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted">Confirmado em</dt>
                        <dd>{dados.dataConfirmacao ? formatDate(dados.dataConfirmacao) : "-"}</dd>
                      </div>
                      {item.dataInicioContrato && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Início do contrato</dt>
                          <dd>{formatDate(item.dataInicioContrato)}</dd>
                        </div>
                      )}
                      {item.dataEstufagem && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Estufagem</dt>
                          <dd>{formatDate(item.dataEstufagem)}</dd>
                        </div>
                      )}
                      {item.dataEmbarque && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Embarque</dt>
                          <dd>{formatDate(item.dataEmbarque)}</dd>
                        </div>
                      )}
                      {item.dataChegada && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Chegada do navio</dt>
                          <dd>{formatDate(item.dataChegada)}</dd>
                        </div>
                      )}
                      {dados.numeroContrato && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Contrato</dt>
                          <dd>{dados.numeroContrato}</dd>
                        </div>
                      )}
                      {dados.numeroContratoInterno && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Contrato interno</dt>
                          <dd>{dados.numeroContratoInterno}</dd>
                        </div>
                      )}
                      {dados.corretoraName && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Broker</dt>
                          <dd>{dados.corretoraName}</dd>
                        </div>
                      )}
                      {dados.valorUsd != null && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Valor</dt>
                          <dd>{formatCurrency(dados.valorUsd, "USD")}</dd>
                        </div>
                      )}
                      {dados.diferencial != null && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Diferencial</dt>
                          <dd className={dados.diferencial < 0 ? "text-danger" : undefined}>
                            {dados.diferencial >= 0 ? "+" : ""}
                            {dados.diferencial.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </dd>
                        </div>
                      )}
                      {dados.tipoFreteNome && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Frete</dt>
                          <dd>{dados.tipoFreteNome}</dd>
                        </div>
                      )}
                      {dados.fixacaoTipo && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Fixação</dt>
                          <dd>{dados.fixacaoTipo === "BUYER" ? "Buyer" : "Seller"}</dd>
                        </div>
                      )}
                      {dados.dataFixacao && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Data da fixação</dt>
                          <dd>{formatDate(dados.dataFixacao)}</dd>
                        </div>
                      )}
                      {dados.nivelBolsa != null && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Nível de bolsa</dt>
                          <dd>{dados.nivelBolsa}</dd>
                        </div>
                      )}
                      {dados.valorDolar != null && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Valor do dólar</dt>
                          <dd>{dados.valorDolar}</dd>
                        </div>
                      )}
                      {dados.tipoEmbalagemNome && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Embalagem</dt>
                          <dd>{dados.tipoEmbalagemNome}</dd>
                        </div>
                      )}
                      {dados.quantidadeSacas != null && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Quantidade</dt>
                          <dd>{dados.quantidadeSacas} sacas</dd>
                        </div>
                      )}
                      {dados.peneiraNome && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Peneira</dt>
                          <dd>{dados.peneiraNome}</dd>
                        </div>
                      )}
                      {dados.padraoNome && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Padrão</dt>
                          <dd>{dados.padraoNome}</dd>
                        </div>
                      )}
                      {dados.previsaoEmbarque && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Previsão embarque</dt>
                          <dd>{formatDate(dados.previsaoEmbarque)}</dd>
                        </div>
                      )}
                      {dados.destinoCarga && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Destino</dt>
                          <dd>{dados.destinoCarga}</dd>
                        </div>
                      )}
                      {dados.formaPagamentoNome && (
                        <div className="flex justify-between gap-2">
                          <dt className="text-muted">Pagamento</dt>
                          <dd>{dados.formaPagamentoNome}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-xs text-muted">
                      Confirmação de negócio ainda não preenchida. Clique no lápis para preencher.
                    </p>
                  )}

                  <AnexosSection
                    contratoId={item.id}
                    status="CONFIRMACAO_NEGOCIO"
                    anexos={anexos[item.id] ?? []}
                  />

                  <PrevisaoEtapa
                    contratoId={item.id}
                    status="CONFIRMACAO_NEGOCIO"
                    previsao={previsoes[item.id]}
                    etapaStatus={statusEtapas[item.id] ?? "NAO_INICIADO"}
                  />

                  <Checklist statusPorEtapa={checklist[item.id] ?? {}} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl"
          title={editingContratoId ? "Confirmação de Negócio" : "Novo Contrato — Confirmação de Negócio"}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número do Contrato</Label>
                <Input
                  value={form.numeroContrato}
                  onChange={(e) => setForm({ ...form, numeroContrato: e.target.value })}
                />
              </div>
              <div>
                <Label>Número do Contrato Interno</Label>
                <Input
                  value={form.numeroContratoInterno}
                  onChange={(e) => setForm({ ...form, numeroContratoInterno: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Data da Confirmação</Label>
                <Input
                  type="date"
                  value={form.dataConfirmacao}
                  onChange={(e) => setForm({ ...form, dataConfirmacao: e.target.value })}
                />
              </div>
              <div>
                <Label>Valor (US$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={calculatedValorUsd.toFixed(2)}
                  disabled
                  title="(Nível de Bolsa + Diferencial) × 1,3228 × Quantidade de Sacas"
                />
              </div>
              <div>
                <Label>Diferencial</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.diferencial}
                  onChange={(e) => setForm({ ...form, diferencial: e.target.value })}
                  placeholder="Ex: -5,00"
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

            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Data de Início do Contrato</Label>
                <Input
                  type="date"
                  value={form.dataInicioContrato}
                  onChange={(e) => setForm({ ...form, dataInicioContrato: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Estufagem</Label>
                <Input
                  type="date"
                  value={form.dataEstufagem}
                  onChange={(e) => setForm({ ...form, dataEstufagem: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Embarque</Label>
                <Input
                  type="date"
                  value={form.dataEmbarque}
                  onChange={(e) => setForm({ ...form, dataEmbarque: e.target.value })}
                />
              </div>
              <div>
                <Label>Chegada do Navio</Label>
                <Input
                  type="date"
                  value={form.dataChegada}
                  onChange={(e) => setForm({ ...form, dataChegada: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Frete</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.tipoFreteId}
                    onChange={(e) => setForm({ ...form, tipoFreteId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {tiposFrete.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  <NovoTipoFrete compact />
                </div>
              </div>
              <div>
                <Label>Fixação</Label>
                <Select
                  value={form.fixacaoTipo}
                  onChange={(e) => setForm({ ...form, fixacaoTipo: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  <option value="BUYER">Buyer</option>
                  <option value="SELLER">Seller</option>
                </Select>
              </div>
              <div>
                <Label>Data da Fixação</Label>
                <Input
                  type="date"
                  value={form.dataFixacao}
                  onChange={(e) => setForm({ ...form, dataFixacao: e.target.value })}
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

            <div className="grid grid-cols-4 gap-3">
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

            <div className="grid grid-cols-3 gap-3">
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
                <Label>Peneira</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.peneiraId}
                    onChange={(e) => setForm({ ...form, peneiraId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {peneiras.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  <NovaPeneira compact />
                </div>
              </div>
              <div>
                <Label>Padrão</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.padraoId}
                    onChange={(e) => setForm({ ...form, padraoId: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {padroesCafe.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  <NovoPadraoCafe compact />
                </div>
              </div>
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <div className="flex gap-2">
                <Select
                  value={form.formaPagamentoId}
                  onChange={(e) => setForm({ ...form, formaPagamentoId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {formasPagamento.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
                <NovaFormaPagamento compact />
              </div>
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
