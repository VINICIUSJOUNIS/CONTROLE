"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCompactCurrency, formatDate } from "@/lib/format";
import { ContratoRow, ContratoAnexoData } from "@/lib/hedge-data";
import {
  updateContratoStatus,
  StatusContratoValue,
} from "@/app/(dashboard)/hedge/contratos/actions";
import { addContratoAnexo, deleteContratoAnexo } from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import { statusOrder, relevantDateField, dateFieldLabels } from "@/lib/contrato-shared";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, ChevronLeft, ChevronRight, Paperclip, Upload, Trash2, X } from "lucide-react";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export function EtapaContratosList({
  contratos,
  status,
  anexos,
}: {
  contratos: ContratoRow[];
  status: StatusContratoValue;
  anexos: Record<string, ContratoAnexoData[]>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
    <div className="flex flex-wrap gap-3">
      {contratos.map((item) => {
        const dateValue = item[dateField];
        return (
          <div key={item.id} className="w-72 shrink-0 rounded-lg border border-border bg-card p-3">
            <p className="font-semibold">{item.contractNumber}</p>
            <p className="text-sm">{item.clienteName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <MapPin size={12} />
              {item.country}
            </p>
            <p className="mt-2 text-sm font-medium text-primary">
              {formatCompactCurrency(item.valorUsd, "USD")}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Calendar size={12} />
              {dateValue
                ? `${dateFieldLabels[dateField]}: ${formatDate(dateValue)}`
                : `${dateFieldLabels[dateField]}: sem data`}
            </p>

            <AnexosSection contratoId={item.id} status={status} anexos={anexos[item.id] ?? []} />

            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
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
        );
      })}
    </div>
  );
}
