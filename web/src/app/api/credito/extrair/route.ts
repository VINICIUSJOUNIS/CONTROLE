// Analise de Credito: recebe o PDF do Balanco Patrimonial e o da DRE do mes (ou
// do trimestre acumulado, com periodo=trimestre), extrai pela IA e grava. A resposta fica aberta enviando um ponto a cada
// poucos segundos (a leitura leva alguns minutos) e termina com uma linha JSON.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ErroExtracao, MODELO_IA, extrairComIa } from "@/lib/credito/extracao-ia";
import { competenciaExtracao, salvarExtracao, salvarExtracaoTrimestre, trimestreExtracao } from "@/lib/credito/dados";
import { salvarDocumentos } from "@/lib/credito/documentos";

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
  const periodo = form.get("periodo") === "trimestre" ? "trimestre" : "mes";
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
        const extracao = await extrairComIa(pdfs, abort.signal, periodo);
        const nomes = pdfs.map((p) => p.nome);
        let destino: string;
        if (periodo === "trimestre") {
          const trimestre = trimestreExtracao(extracao);
          if (!trimestre) {
            const data = extracao.dataBalanco.split("-").reverse().join("/");
            throw new ErroExtracao(`O balanço do PDF é de ${data}: o trimestre precisa fechar em março, junho, setembro ou dezembro.`);
          }
          const documentos = await salvarDocumentos(supabase, `analise/${trimestre}`, pdfs);
          await salvarExtracaoTrimestre(trimestre, extracao, nomes, documentos, MODELO_IA);
          destino = `/credito/trimestre/${trimestre}`;
        } else {
          const competencia = competenciaExtracao(extracao);
          const documentos = await salvarDocumentos(supabase, `analise/${competencia}`, pdfs);
          await salvarExtracao(extracao, nomes, documentos, MODELO_IA);
          destino = `/credito/${competencia}`;
        }
        revalidatePath("/credito", "layout");
        controller.enqueue(encoder.encode(`\n${JSON.stringify({ destino })}`));
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
