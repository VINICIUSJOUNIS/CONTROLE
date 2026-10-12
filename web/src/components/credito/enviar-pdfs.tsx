"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Limite de corpo de requisicao da Vercel e ~4,5 MB.
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

export function EnviarPdfs() {
  const router = useRouter();
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  async function enviar() {
    if (arquivos.length === 0) return;
    if (arquivos.reduce((s, f) => s + f.size, 0) > TAMANHO_MAXIMO) {
      setErro("Os PDFs somados passam de 4 MB.");
      return;
    }
    setErro("");
    setEnviando(true);
    setSegundos(0);
    const inicio = Date.now();
    const timer = setInterval(() => setSegundos(Math.round((Date.now() - inicio) / 1000)), 1000);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const form = new FormData();
      for (const f of arquivos) form.append("arquivos", f);
      const res = await fetch("/api/credito/extrair", { method: "POST", body: form, signal: controller.signal });
      const texto = await res.text();
      const ultima = texto.trim().split("\n").pop() ?? "";
      let resposta: { competencia?: string; erro?: string } = {};
      try {
        resposta = JSON.parse(ultima.replace(/^\.+/, ""));
      } catch {
        resposta = { erro: "Resposta inesperada do servidor." };
      }
      if (!res.ok || resposta.erro || !resposta.competencia) {
        setErro(resposta.erro ?? "Falha ao processar os PDFs.");
        return;
      }
      router.push(`/credito/${resposta.competencia}`);
      router.refresh();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setErro("Falha de conexão ao enviar os PDFs.");
    } finally {
      clearInterval(timer);
      setEnviando(false);
      abortRef.current = null;
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Incluir mês</h2>
          <p className="text-xs text-muted">
            Envie o Balanço Patrimonial e a DRE do mês em PDF (um ou dois arquivos). A IA extrai e reclassifica as
            contas, e o sistema calcula todos os indicadores. Se o mês já existir, ele é substituído.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span className="mb-1 block text-xs font-medium text-muted">PDFs do balanço e da DRE</span>
            <input
              type="file"
              accept="application/pdf"
              multiple
              disabled={enviando}
              onChange={(e) => setArquivos(Array.from(e.target.files ?? []).slice(0, 2))}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
          </label>
          {enviando ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              <Loader2 size={14} className="animate-spin" />
              Cancelar
            </Button>
          ) : (
            <Button onClick={enviar} disabled={arquivos.length === 0}>
              <FileUp size={14} />
              Analisar
            </Button>
          )}
        </div>
        {arquivos.length > 0 && !enviando && <p className="text-xs text-muted">{arquivos.map((f) => f.name).join(" + ")}</p>}
        {enviando && (
          <p className="text-xs text-muted">
            A IA está lendo os PDFs e classificando as contas ({segundos}s). Costuma levar de 1 a 4 minutos.
          </p>
        )}
        {erro && <p className="text-sm text-danger">{erro}</p>}
      </CardContent>
    </Card>
  );
}
