// PDFs enviados na Analise de Credito, guardados no bucket privado
// credito-documentos do Supabase Storage. Cada mes fica numa pasta
// (analise/AAAA-MM ou despesas/AAAA-MM) que e substituida quando o mes e reenviado.
import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET_DOCUMENTOS = "credito-documentos";

const nomeSeguro = (nome: string) =>
  nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_");

// Grava os PDFs na pasta do mes e devolve o caminho de cada um, na mesma ordem.
// Falha no Storage nao derruba a analise: devolve lista vazia e registra no log.
export async function salvarDocumentos(
  supabase: SupabaseClient,
  pasta: string,
  pdfs: { nome: string; base64: string }[]
): Promise<string[]> {
  try {
    const { data: antigos } = await supabase.storage.from(BUCKET_DOCUMENTOS).list(pasta);
    if (antigos?.length) await supabase.storage.from(BUCKET_DOCUMENTOS).remove(antigos.map((o) => `${pasta}/${o.name}`));
    const caminhos: string[] = [];
    for (const [i, p] of pdfs.entries()) {
      const caminho = `${pasta}/${i + 1}-${nomeSeguro(p.nome)}`;
      const { error } = await supabase.storage
        .from(BUCKET_DOCUMENTOS)
        .upload(caminho, Buffer.from(p.base64, "base64"), { contentType: "application/pdf", upsert: true });
      if (error) throw error;
      caminhos.push(caminho);
    }
    return caminhos;
  } catch (e) {
    console.error("Falha ao guardar os PDFs de credito:", e);
    return [];
  }
}

export async function removerDocumentos(supabase: SupabaseClient, caminhos: string[]) {
  if (caminhos.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET_DOCUMENTOS).remove(caminhos);
  if (error) console.error("Falha ao excluir os PDFs de credito:", error);
}

// Link para abrir o PDF guardado (a rota gera uma URL assinada de curta duracao).
export const urlDocumento = (caminho: string) => `/api/credito/documento?p=${encodeURIComponent(caminho)}`;
