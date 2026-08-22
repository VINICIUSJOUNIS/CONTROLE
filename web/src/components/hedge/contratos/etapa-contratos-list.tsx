"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { ContratoRow, ContratoAnexoData, HistoricoAnteriorItem } from "@/lib/hedge-data";
import {
  updateContratoStatus,
  StatusContratoValue,
} from "@/app/(dashboard)/hedge/contratos/actions";
import {
  addContratoAnexo,
  deleteContratoAnexo,
  setPrevisaoEtapa,
} from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import { statusOrder, statusLabels, relevantDateField, dateFieldLabels } from "@/lib/contrato-shared";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Paperclip,
  Upload,
  X,
  AlertTriangle,
} from "lucide-react";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseISODateLocal(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function alertaPrazo(dataPrevisao: string): { label: string; tone: "warning" | "danger" } | null {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prevista = parseISODateLocal(dataPrevisao);
  const dias = Math.round((prevista.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (dias < 0) return { label: `Atrasado ${Math.abs(dias)} dia(s)`, tone: "danger" };
  if (dias === 0) return { label: "Vence hoje", tone: "warning" };
  if (dias <= 3) return { label: `Vence em ${dias} dia(s)`, tone: "warning" };
  return null;
}

function PrevisaoAssinatura({
  contratoId,
  status,
  previsao,
}: {
  contratoId: string;
  status: StatusContratoValue;
  previsao: string | undefined;
}) {
  const router = useRouter();
  const [value, setValue] = useState(previsao ?? "");
  const [isPending, startTransition] = useTransition();
  const alerta = value ? alertaPrazo(value) : null;

  // So salva quando o campo perde o foco (nao a cada tecla) e so se a data
  // estiver completa e valida - digitar um ano parcial (ex: "2" -> "0002")
  // nao dispara mais um save intermediario com data invalida.
  function handleBlur() {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1900)) {
      setValue(previsao ?? "");
      return;
    }
    if (value === (previsao ?? "")) return;
    startTransition(async () => {
      await setPrevisaoEtapa(contratoId, status, value);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-2">
      <label className="flex items-center justify-between gap-2 text-xs text-muted">
        Previsão de assinatura
        <input
          type="date"
          value={value}
          disabled={isPending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
        />
      </label>
      {alerta && (
        <p
          className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            alerta.tone === "danger" ? "text-danger" : "text-warning"
          }`}
        >
          <AlertTriangle size={12} />
          {alerta.label}
        </p>
      )}
    </div>
  );
}

async function uploadAnexo(contratoId: string, status: StatusContratoValue, file: File) {
  const supabase = createClient();
  const path = `${contratoId}/${status}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("contrato-anexos").upload(path, file);
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("contrato-anexos").getPublicUrl(path);

  await addContratoAnexo({
    contratoId,
    etapa: status,
    fileName: file.name,
    fileUrl: data.publicUrl,
    fileSize: file.size,
  });
}

function QuickUploadButton({ contratoId, status }: { contratoId: string; status: StatusContratoValue }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      await uploadAnexo(contratoId, status, file);
      router.refresh();
    } catch {
      // erro exibido na lista de anexos ao expandir a linha
    } finally {
      setUploading(false);
    }
  }

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        <Upload size={14} />
        {uploading ? "Enviando..." : "Anexar"}
      </button>
      <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
    </span>
  );
}

function AnexosSection({
  contratoId,
  status,
  anexos,
}: {
  contratoId: string;
  status: StatusContratoValue;
  anexos: ContratoAnexoData[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await uploadAnexo(contratoId, status, file);
      router.refresh();
    } catch {
      setError("Nao foi possivel enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(anexo: ContratoAnexoData) {
    if (!window.confirm(`Excluir o anexo "${anexo.fileName}"?`)) return;
    startTransition(async () => {
      const supabase = createClient();
      const path = anexo.fileUrl.split("/contrato-anexos/")[1];
      if (path) {
        await supabase.storage.from("contrato-anexos").remove([decodeURIComponent(path)]);
      }
      await deleteContratoAnexo(anexo.id);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs font-medium text-muted">
          <Paperclip size={12} />
          Anexos
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Upload size={12} />
          {uploading ? "Enviando..." : "Enviar"}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}

      {anexos.length === 0 ? (
        <p className="mt-1 text-xs text-muted">Nenhum anexo ainda.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
              <a
                href={a.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-primary hover:underline"
                title={a.fileName}
              >
                {a.fileName}
              </a>
              <span className="shrink-0 text-muted">{formatFileSize(a.fileSize)}</span>
              <button
                onClick={() => handleDelete(a)}
                disabled={isPending}
                className="shrink-0 rounded p-0.5 text-muted hover:bg-danger/10 hover:text-danger"
                title="Excluir anexo"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfirmacaoNegocioResumo({ dados }: { dados: NonNullable<HistoricoAnteriorItem["confirmacaoNegocio"]> }) {
  const linhas: [string, string][] = [];
  if (dados.dataConfirmacao) linhas.push(["Confirmado em", formatDate(dados.dataConfirmacao)]);
  if (dados.numeroContrato) linhas.push(["Contrato", dados.numeroContrato]);
  if (dados.corretoraName) linhas.push(["Broker", dados.corretoraName]);
  if (dados.valorUsd != null) linhas.push(["Valor", formatCurrency(dados.valorUsd, "USD")]);
  if (dados.diferencial != null)
    linhas.push([
      "Diferencial",
      `${dados.diferencial >= 0 ? "+" : ""}${dados.diferencial.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ]);
  if (dados.frete) linhas.push(["Frete", dados.frete]);
  if (dados.fixacaoTipo) linhas.push(["Fixação", dados.fixacaoTipo === "BUYER" ? "Buyer" : "Seller"]);
  if (dados.dataFixacao) linhas.push(["Data da fixação", formatDate(dados.dataFixacao)]);
  if (dados.nivelBolsa != null) linhas.push(["Nível de bolsa", String(dados.nivelBolsa)]);
  if (dados.valorDolar != null) linhas.push(["Valor do dólar", String(dados.valorDolar)]);
  if (dados.tipoEmbalagemNome) linhas.push(["Embalagem", dados.tipoEmbalagemNome]);
  if (dados.quantidadeSacas != null) linhas.push(["Quantidade", `${dados.quantidadeSacas} sacas`]);
  if (dados.descricaoCafe) linhas.push(["Café", dados.descricaoCafe]);
  if (dados.previsaoEmbarque) linhas.push(["Previsão embarque", formatDate(dados.previsaoEmbarque)]);
  if (dados.destinoCarga) linhas.push(["Destino", dados.destinoCarga]);
  if (dados.formaPagamentoNome) linhas.push(["Pagamento", dados.formaPagamentoNome]);

  if (linhas.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {statusLabels.CONFIRMACAO_NEGOCIO}
      </p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        {linhas.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function HistoricoAnterior({ item }: { item: HistoricoAnteriorItem | undefined }) {
  if (!item) return <p className="text-xs text-muted">Nenhuma etapa anterior preenchida ainda.</p>;

  const temAlgo = item.confirmacaoNegocio || item.porEtapa.some((e) => e.anexos.length > 0 || e.previsao);
  if (!temAlgo) return <p className="text-xs text-muted">Nenhuma etapa anterior preenchida ainda.</p>;

  return (
    <div className="space-y-3">
      {item.confirmacaoNegocio && <ConfirmacaoNegocioResumo dados={item.confirmacaoNegocio} />}
      {item.porEtapa
        .filter((e) => e.anexos.length > 0 || e.previsao)
        .map((e) => (
          <div key={e.etapa}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{statusLabels[e.etapa]}</p>
            {e.previsao && (
              <p className="mt-1 text-xs">
                Previsão: <span className="text-foreground">{formatDate(e.previsao)}</span>
              </p>
            )}
            {e.anexos.length > 0 && (
              <ul className="mt-1 space-y-1">
                {e.anexos.map((a) => (
                  <li key={a.id} className="flex items-center gap-1 text-xs">
                    <Paperclip size={11} className="shrink-0 text-muted" />
                    <a
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate text-primary hover:underline"
                      title={a.fileName}
                    >
                      {a.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </div>
  );
}

export function EtapaContratosList({
  contratos,
  status,
  anexos,
  previsoes,
  historico,
}: {
  contratos: ContratoRow[];
  status: StatusContratoValue;
  anexos: Record<string, ContratoAnexoData[]>;
  previsoes: Record<string, string>;
  historico: Record<string, HistoricoAnteriorItem>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dateField = relevantDateField[status];
  const idx = statusOrder.indexOf(status);

  function moveStatus(id: string, direction: -1 | 1) {
    const nextIndex = idx + direction;
    if (nextIndex < 0 || nextIndex >= statusOrder.length) return;
    startTransition(async () => {
      await updateContratoStatus(id, statusOrder[nextIndex]);
      router.refresh();
    });
  }

  if (contratos.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted">Nenhum contrato nesta etapa.</Card>;
  }

  return (
    <div className="space-y-2">
      {contratos.map((item) => {
        const dateValue = item[dateField];
        const isExpanded = expandedId === item.id;
        return (
          <Card key={item.id} className="overflow-hidden p-0">
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
                  {dateValue
                    ? `${dateFieldLabels[dateField]}: ${formatDate(dateValue)}`
                    : `${dateFieldLabels[dateField]}: sem data`}
                </p>
                {(anexos[item.id]?.length ?? 0) > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <Paperclip size={12} />
                    {anexos[item.id]!.length}
                  </span>
                )}
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <QuickUploadButton contratoId={item.id} status={status} />
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Etapas anteriores
                </p>
                <HistoricoAnterior item={historico[item.id]} />

                <AnexosSection contratoId={item.id} status={status} anexos={anexos[item.id] ?? []} />

                {status === "ASSINATURA_CONTRATO" && (
                  <PrevisaoAssinatura contratoId={item.id} status={status} previsao={previsoes[item.id]} />
                )}

                {status === "ASSINATURA_CONTRATO" && (
                  <label className="mt-3 flex items-center gap-2 border-t border-border pt-2 text-xs">
                    <input
                      type="checkbox"
                      disabled={isPending}
                      onChange={(e) => {
                        if (e.target.checked) moveStatus(item.id, 1);
                      }}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    Contrato assinado
                  </label>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
