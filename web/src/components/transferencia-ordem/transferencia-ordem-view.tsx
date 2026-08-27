"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { valorPorExtenso } from "@/lib/extenso";
import {
  saveBankTransferChannel,
  createTransferenciaOrdem,
  updateTransferenciaOrdem,
  deleteTransferenciaOrdem,
} from "@/app/(dashboard)/transferencia-ordem/actions";
import { Printer, Save, Pencil, FilePlus2, Trash2, FileText } from "lucide-react";

type CanalBancario = {
  moeda: string;
  instrucoes: string;
};

type Bank = { id: string; name: string; transferChannel: CanalBancario | null };

type TransferenciaSalva = {
  id: string;
  cidade: string;
  data: string;
  tipo: string;
  numeroOrdem: string;
  moeda: string;
  valor: number;
  valorExtenso: string;
  bankId: string | null;
  bancoDestino: string;
  descontaTarifa: string;
  valorTarifa: number | null;
  instrucoes: string;
  observacoes: string;
};

const canalVazio: CanalBancario = {
  moeda: "USD",
  instrucoes: "",
};

const moedaOptions = [
  { value: "USD", label: "US$ - Dólar" },
  { value: "EUR", label: "€ - Euro" },
  { value: "GBP", label: "£ - Libra esterlina" },
  { value: "BRL", label: "R$ - Real" },
];

const moedaSimbolo: Record<string, string> = { USD: "US$", EUR: "€", GBP: "£", BRL: "R$" };

const mesesPt = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatarDataExtenso(dataStr: string) {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  return `${dia} de ${mesesPt[mes - 1]} de ${ano}`;
}

function formValue(valor: string) {
  const n = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatBR(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emptyForm() {
  return {
    cidade: "Manhuaçu",
    data: new Date().toISOString().slice(0, 10),
    tipo: "PARCIAL" as "PARCIAL" | "TOTAL",
    numeroOrdem: "",
    valor: "",
    valorExtenso: "",
    bancoId: "",
    bancoDestino: "",
    descontaTarifa: "NAO" as "SIM" | "NAO",
    valorTarifa: "",
    observacoes: "",
    ...canalVazio,
  };
}

export function TransferenciaOrdemView({
  banks,
  initialTransferencias,
}: {
  banks: Bank[];
  initialTransferencias: TransferenciaSalva[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [form, setForm] = useState(emptyForm());
  const [editandoCanal, setEditandoCanal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setValorEMoeda(valor: string, moeda: string) {
    const valorNum = formValue(valor);
    setForm((prev) => ({
      ...prev,
      valor,
      moeda,
      valorExtenso: valorNum > 0 ? valorPorExtenso(valorNum, moeda) : "",
    }));
  }

  function selecionarBanco(bancoId: string) {
    const banco = banks.find((b) => b.id === bancoId);
    setEditandoCanal(false);
    setForm((prev) => ({
      ...prev,
      bancoId,
      bancoDestino: banco?.name ?? prev.bancoDestino,
      ...(banco ? banco.transferChannel ?? canalVazio : {}),
    }));
  }

  function salvarCanalPadrao() {
    if (!form.bancoId) return;
    const { moeda, instrucoes } = form;
    startTransition(async () => {
      await saveBankTransferChannel(form.bancoId, { moeda, instrucoes });
      setEditandoCanal(false);
      router.refresh();
    });
  }

  function novaTransferencia() {
    setForm(emptyForm());
    setEditingId(null);
    setEditandoCanal(false);
  }

  function carregarTransferencia(t: TransferenciaSalva) {
    setEditingId(t.id);
    setEditandoCanal(false);
    setForm({
      cidade: t.cidade,
      data: t.data,
      tipo: t.tipo as "PARCIAL" | "TOTAL",
      numeroOrdem: t.numeroOrdem,
      moeda: t.moeda,
      valor: formatBR(t.valor),
      valorExtenso: t.valorExtenso,
      bancoId: t.bankId ?? "",
      bancoDestino: t.bancoDestino,
      descontaTarifa: t.descontaTarifa as "SIM" | "NAO",
      valorTarifa: t.valorTarifa != null ? formatBR(t.valorTarifa) : "",
      instrucoes: t.instrucoes,
      observacoes: t.observacoes,
    });
  }

  function salvarTransferencia() {
    const payload = {
      cidade: form.cidade,
      data: form.data,
      tipo: form.tipo,
      numeroOrdem: form.numeroOrdem,
      moeda: form.moeda,
      valor: formValue(form.valor),
      valorExtenso: form.valorExtenso,
      bankId: form.bancoId || null,
      bancoDestino: form.bancoDestino,
      descontaTarifa: form.descontaTarifa,
      valorTarifa: form.descontaTarifa === "SIM" ? formValue(form.valorTarifa) : null,
      instrucoes: form.instrucoes,
      observacoes: form.observacoes,
    };
    startSaving(async () => {
      if (editingId) {
        await updateTransferenciaOrdem(editingId, payload);
      } else {
        const id = await createTransferenciaOrdem(payload);
        setEditingId(id);
      }
      router.refresh();
    });
  }

  function excluirTransferencia(t: TransferenciaSalva) {
    if (!window.confirm(`Excluir a transferência de ordem nº ${t.numeroOrdem || t.id}? Esta ação não pode ser desfeita.`))
      return;
    startTransition(async () => {
      await deleteTransferenciaOrdem(t.id);
      if (editingId === t.id) novaTransferencia();
      router.refresh();
    });
  }

  const simbolo = moedaSimbolo[form.moeda] ?? "US$";
  const valorFormatado = form.valor
    ? Number(formValue(form.valor)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";

  return (
    <div className="relative">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <div className="grid grid-cols-1 gap-6 print:hidden xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados da ordem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de transferência</Label>
                  <Select value={form.tipo} onChange={(e) => set("tipo", e.target.value as "PARCIAL" | "TOTAL")}>
                    <option value="PARCIAL">Parcial</option>
                    <option value="TOTAL">Total</option>
                  </Select>
                </div>
                <div>
                  <Label>Nº da ordem de pagamento</Label>
                  <Input value={form.numeroOrdem} onChange={(e) => set("numeroOrdem", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Moeda</Label>
                  <Select value={form.moeda} onChange={(e) => setValorEMoeda(form.valor, e.target.value)}>
                    {moedaOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Valor ({simbolo})</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 42.096,40"
                    value={form.valor}
                    onChange={(e) => setValorEMoeda(e.target.value, form.moeda)}
                  />
                </div>
              </div>
              <div>
                <Label>Valor por extenso</Label>
                <Textarea
                  rows={2}
                  value={form.valorExtenso}
                  onChange={(e) => set("valorExtenso", e.target.value)}
                  placeholder="Preenchido automaticamente ao digitar o valor"
                />
                <p className="mt-1 text-xs text-muted">Gerado automaticamente — pode editar se precisar ajustar.</p>
              </div>
              <div>
                <Label>Banco de destino</Label>
                <Select value={form.bancoId} onChange={(e) => selecionarBanco(e.target.value)}>
                  <option value="">Selecione um banco cadastrado…</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {!b.transferChannel ? " (sem canal cadastrado)" : ""}
                    </option>
                  ))}
                </Select>
                {!form.bancoId && (
                  <Input
                    className="mt-2"
                    value={form.bancoDestino}
                    onChange={(e) => set("bancoDestino", e.target.value)}
                    placeholder="Ou digite o nome de um banco fora da lista"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Desconta tarifa do banqueiro?</Label>
                  <Select
                    value={form.descontaTarifa}
                    onChange={(e) => set("descontaTarifa", e.target.value as "SIM" | "NAO")}
                  >
                    <option value="NAO">Não</option>
                    <option value="SIM">Sim</option>
                  </Select>
                </div>
                {form.descontaTarifa === "SIM" && (
                  <div>
                    <Label>Valor da tarifa ({simbolo})</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 50,00"
                      value={form.valorTarifa}
                      onChange={(e) => set("valorTarifa", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Canal bancário (instruções de crédito)</CardTitle>
              {form.bancoId && (
                <button
                  type="button"
                  onClick={() => setEditandoCanal((v) => !v)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil size={12} />
                  {editandoCanal ? "Cancelar edição" : "Editar canal deste banco"}
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {form.bancoId && !editandoCanal ? (
                <p className="text-xs text-muted">
                  Preenchido automaticamente com o canal cadastrado para este banco. Clique em
                  &quot;Editar canal deste banco&quot; para corrigir o texto salvo.
                </p>
              ) : (
                <p className="text-xs text-muted">
                  {form.bancoId
                    ? "Editando o canal padrão deste banco — salve para atualizar para as próximas transferências."
                    : "Selecione um banco cadastrado acima para preencher automaticamente, ou cole abaixo o texto do canal para um banco avulso."}
                </p>
              )}
              <div>
                <Textarea
                  rows={14}
                  disabled={!!form.bancoId && !editandoCanal}
                  className="font-mono text-xs disabled:opacity-60"
                  value={form.instrucoes}
                  onChange={(e) => set("instrucoes", e.target.value)}
                  placeholder="Cole aqui exatamente o texto do canal bancário/instruções SWIFT-MT103 fornecido pelo banco, sem editar."
                />
                <p className="mt-1 text-xs text-muted">
                  Colado literalmente do documento do banco — aparece na carta exatamente como está aqui.
                </p>
              </div>
              {editandoCanal && form.bancoId && (
                <Button onClick={salvarCanalPadrao} disabled={isPending} className="w-full" variant="outline">
                  <Save size={14} />
                  {isPending ? "Salvando…" : "Salvar como canal padrão deste banco"}
                </Button>
              )}
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={salvarTransferencia} disabled={isSaving} className="flex-1">
              <Save size={16} />
              {isSaving ? "Salvando…" : editingId ? "Salvar alterações" : "Salvar transferência"}
            </Button>
            <Button onClick={novaTransferencia} variant="outline">
              <FilePlus2 size={16} />
              Nova
            </Button>
          </div>

          <Button onClick={() => window.print()} variant="outline" className="w-full">
            <Printer size={16} />
            Imprimir no papel timbrado
          </Button>

          {initialTransferencias.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Transferências salvas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2 pt-0">
                {initialTransferencias.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2 rounded-lg p-2 text-sm ${
                      editingId === t.id ? "bg-primary/10" : "hover:bg-background"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => carregarTransferencia(t)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <FileText size={14} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate">
                        {t.numeroOrdem || "(sem número)"} — {t.bancoDestino || "?"}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {moedaSimbolo[t.moeda] ?? t.moeda} {formatBR(t.valor)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirTransferencia(t)}
                      className="shrink-0 rounded p-1 text-muted hover:text-danger"
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <CartaPreview
              form={form}
              simbolo={simbolo}
              valorFormatado={valorFormatado}
              className="mx-auto border border-border shadow-sm"
            />
          </CardContent>
        </Card>
      </div>

      <div className="hidden print:block">
        <CartaPreview form={form} simbolo={simbolo} valorFormatado={valorFormatado} />
      </div>
    </div>
  );
}

function CartaPreview({
  form,
  simbolo,
  valorFormatado,
  className = "",
}: {
  form: ReturnType<typeof emptyForm>;
  simbolo: string;
  valorFormatado: string;
  className?: string;
}) {
  const tipoLabel = form.tipo === "PARCIAL" ? "parcial" : "total";

  return (
    <div className={`flex w-full flex-col bg-white text-[#1c2b36] print:h-[297mm] print:w-[210mm] ${className}`}>
      <Image
        src="/nayme-letterhead-header.png"
        alt="Nayme Comércio e Exportação de Café"
        width={1809}
        height={330}
        className="h-auto w-full"
        priority
      />

      <div className="flex-1 px-10 py-8 text-[13px] leading-relaxed print:px-14 print:py-10 print:text-[12px]">
        <p className="mb-6">
          {form.cidade || "Manhuaçu"}, {formatarDataExtenso(form.data)}
        </p>

        <p className="mb-6 text-justify">
          Solicitamos a transferência {tipoLabel} da ordem de pagamento recebida do exterior nº{" "}
          <strong>{form.numeroOrdem || "____________"}</strong> no valor de {simbolo}{" "}
          <strong>{valorFormatado}</strong>
          {form.valorExtenso && <> ({form.valorExtenso})</>} para o{" "}
          <strong>{form.bancoDestino || "____________"}</strong> conforme canal bancário abaixo:
        </p>

        {form.instrucoes && (
          <div className="mb-6 rounded-md border border-[#1c8388]/30 bg-[#1c8388]/5 p-4">
            <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed print:text-[10px]">
              {form.instrucoes}
            </p>
          </div>
        )}

        {form.descontaTarifa === "SIM" && (
          <p className="mb-6 text-justify">
            Favor descontar a ordem do banqueiro em conta corrente no valor de {simbolo}{" "}
            {formValue(form.valorTarifa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            , não desconta na transferência desta ordem.
          </p>
        )}

        {form.observacoes && <p className="mb-6 text-justify">{form.observacoes}</p>}

        <div className="mt-16 grid grid-cols-1 gap-10 print:mt-24">
          <div className="mx-auto w-2/3 text-center text-xs">
            <div className="border-t border-[#1c2b36] pt-2">Assinatura autorizada</div>
          </div>
        </div>
      </div>

      <Image
        src="/nayme-letterhead-footer.png"
        alt="Nayme Comércio e Exportação de Café - contato"
        width={1962}
        height={441}
        className="mt-auto h-auto w-full"
      />
    </div>
  );
}
