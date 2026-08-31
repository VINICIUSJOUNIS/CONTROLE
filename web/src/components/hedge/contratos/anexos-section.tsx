"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ContratoAnexoData } from "@/lib/hedge-data";
import { addContratoAnexo, deleteContratoAnexo } from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import { StatusContratoValue } from "@/app/(dashboard)/hedge/contratos/actions";
import { statusLabels } from "@/lib/contrato-shared";
import { Paperclip, Upload, X } from "lucide-react";

export function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadAnexo(contratoId: string, status: StatusContratoValue, file: File) {
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

// Anexos sempre mostram TODOS os arquivos do contrato, de qualquer etapa
// da Mesa de Operacao - assim ficam acessiveis nao importa em qual etapa o
// contrato esteja no momento. Novos uploads sao marcados com a etapa atual
// (so para referencia), mas aparecem aqui de qualquer lugar.
export function AnexosSection({
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
              {a.etapa !== status && (
                <span className="shrink-0 truncate text-muted" title={statusLabels[a.etapa]}>
                  {statusLabels[a.etapa]}
                </span>
              )}
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
