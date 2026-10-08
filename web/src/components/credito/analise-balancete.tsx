"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import { FileUp, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Limite de corpo de requisicao da Vercel e ~4,5 MB.
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

export function AnaliseBalancete() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [relatorio, setRelatorio] = useState("");
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function analisar() {
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro("O PDF passa de 4 MB. Envie um arquivo menor.");
      return;
    }
    setErro("");
    setRelatorio("");
    setGerando(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const form = new FormData();
      form.append("file", arquivo);
      const res = await fetch("/api/credito/analise", { method: "POST", body: form, signal: controller.signal });
      if (!res.ok || !res.body) {
        setErro((await res.text()) || "Falha ao gerar a análise.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const parte = decoder.decode(value, { stream: true });
        setRelatorio((r) => r + parte);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setErro("Falha de conexão ao gerar a análise.");
    } finally {
      setGerando(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <label className="flex-1 min-w-[240px]">
            <span className="mb-1 block text-xs font-medium text-muted">PDF do balancete</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
          </label>
          {gerando ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              <Loader2 size={14} className="animate-spin" />
              Cancelar
            </Button>
          ) : (
            <Button onClick={analisar} disabled={!arquivo}>
              <FileUp size={14} />
              Analisar balancete
            </Button>
          )}
          {relatorio && !gerando && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={14} />
              Imprimir / PDF
            </Button>
          )}
        </CardContent>
      </Card>

      {erro && <p className="text-sm text-danger">{erro}</p>}

      {gerando && !relatorio && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" />
          Lendo o balancete... a análise completa pode levar alguns minutos.
        </p>
      )}

      {relatorio && (
        <Card>
          <CardContent className="space-y-3 p-6 text-sm leading-relaxed">
            {arquivo && <p className="text-xs text-muted">Documento: {arquivo.name}</p>}
            <Markdown texto={relatorio} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Renderizador simples do Markdown que a IA devolve: titulos, listas, tabelas,
// negrito e italico.
function inline(texto: string): ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*|(?<!\w)_[^_]+_(?!\w))/g);
  return partes.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : p.length > 2 && p.startsWith("_") && p.endsWith("_") ? (
      <em key={i}>{p.slice(1, -1)}</em>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    )
  );
}

function celulas(linha: string) {
  return linha.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function Markdown({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    const t = linha.trim();
    if (!t) {
      i++;
    } else if (t.startsWith("|")) {
      const tabela: string[] = [];
      while (i < linhas.length && linhas[i].trim().startsWith("|")) tabela.push(linhas[i++]);
      const [cab, ...resto] = tabela;
      const corpo = resto.filter((l) => !/^\|?\s*:?-+/.test(l.trim()));
      blocos.push(
        <div key={blocos.length} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {celulas(cab).map((c, j) => (
                  <th key={j} className="border-b border-border px-2 py-1.5 text-left font-semibold">
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corpo.map((l, k) => (
                <tr key={k} className="border-b border-border/60">
                  {celulas(l).map((c, j) => (
                    <td key={j} className="px-2 py-1">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (/^[-*] /.test(t)) {
      const itens: string[] = [];
      while (i < linhas.length && /^[-*] /.test(linhas[i].trim())) itens.push(linhas[i++].trim().slice(2));
      blocos.push(
        <ul key={blocos.length} className="list-disc space-y-1 pl-5">
          {itens.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </ul>
      );
    } else if (/^\d+[.)] /.test(t)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\d+[.)] /.test(linhas[i].trim())) itens.push(linhas[i++].trim().replace(/^\d+[.)] /, ""));
      blocos.push(
        <ol key={blocos.length} className="list-decimal space-y-1 pl-5">
          {itens.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </ol>
      );
    } else if (t.startsWith("#")) {
      const nivel = t.match(/^#+/)![0].length;
      const conteudo = inline(t.replace(/^#+\s*/, ""));
      blocos.push(
        nivel <= 2 ? (
          <h2 key={blocos.length} className="border-b border-border pt-4 pb-1 text-base font-semibold text-primary">
            {conteudo}
          </h2>
        ) : (
          <h3 key={blocos.length} className="pt-2 font-semibold">
            {conteudo}
          </h3>
        )
      );
      i++;
    } else if (/^-{3,}$/.test(t)) {
      blocos.push(<hr key={blocos.length} className="border-border" />);
      i++;
    } else {
      blocos.push(<p key={blocos.length}>{inline(t)}</p>);
      i++;
    }
  }
  return <>{blocos}</>;
}
