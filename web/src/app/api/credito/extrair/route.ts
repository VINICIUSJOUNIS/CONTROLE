// Analise de Credito: recebe o PDF do Balanco Patrimonial e o da DRE do mes,
// extrai pela IA e grava o mes. A resposta fica aberta enviando um ponto a cada
// poucos segundos (a leitura leva alguns minutos) e termina com uma linha JSON.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ErroExtracao, MODELO_IA, extrairComIa } from "@/lib/credito/extracao-ia";
import { salvarExtracao } from "@/lib/credito/dados";

export const maxDuration = 300;

// Limite de corpo de requisicao da Vercel e ~4,5 MB.
const TAMANHO_MAXIMO = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login novamente." }, { status: 401 });

  const form = await request.formData();
  const arquivos = form.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);
  if (arquivos.length === 0) return Response.json({ erro: "Selecione o PDF do balanço e da DRE." }, { status: 400 });
  if (arquivos.length > 2) return Response.json({ erro: "Envie no máximo dois PDFs (balanço e DRE)." }, { status: 400 });
  if (arquivos.some((f) => f.type !== "application/pdf")) return Response.json({ erro: "Os arquivos precisam ser PDF." }, { status: 400 });
  if (arquivos.reduce((s, f) => s + f.size, 0) > TAMANHO_MAXIMO) {
    return Response.json({ erro: "Os PDFs somados passam de 4 MB." }, { status: 400 });
  }

  const pdfs = await Promise.all(
    arquivos.map(async (f) => ({ nome: f.name, base64: Buffer.from(await f.arrayBuffer()).toString("base64") }))
  );

  const encoder = new TextEncoder();
  const abort = new AbortController();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const ping = setInterval(() => controller.enqueue(encoder.encode(".")), 5000);
      try {
        const extracao = await extrairComIa(pdfs, abort.signal);
        const salvo = await salvarExtracao(extracao, pdfs.map((p) => p.nome), MODELO_IA);
        revalidatePath("/credito");
        const competencia = salvo.competencia.toISOString().slice(0, 7);
        controller.enqueue(encoder.encode(`\n${JSON.stringify({ competencia })}`));
      } catch (e) {
        console.error("Analise de credito:", e);
        const erro = e instanceof ErroExtracao ? e.message : "Falha inesperada ao processar os PDFs.";
        controller.enqueue(encoder.encode(`\n${JSON.stringify({ erro })}`));
      } finally {
        clearInterval(ping);
        controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
