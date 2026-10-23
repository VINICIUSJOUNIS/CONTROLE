import { FileText } from "lucide-react";
import { urlDocumento } from "@/lib/credito/documentos";

// Nomes dos PDFs enviados no mes; os que foram guardados abrem numa nova aba.
export function DocumentosLinks({ arquivos, documentos }: { arquivos: string[]; documentos: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {arquivos.map((nome, i) =>
        documentos[i] ? (
          <a
            key={i}
            href={urlDocumento(documentos[i])}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <FileText size={12} />
            {nome}
          </a>
        ) : (
          <span key={i}>{nome}</span>
        )
      )}
    </span>
  );
}
