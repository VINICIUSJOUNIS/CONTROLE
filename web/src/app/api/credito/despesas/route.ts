// Controle de Despesas Fixas: recebe o balancete do mes em PDF, extrai as contas
// de despesa pela IA e grava o mes. Mantem a resposta aberta com um ponto a cada
// poucos segundos e termina com uma linha JSON.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ErroExtracao, MODELO_IA } from "@/lib/credito/extracao-ia";
import { extrairDespesasComIa } from "@/lib/credito/despesas-ia";
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
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return Response.json({ erro: "Selecione o PDF do balancete." }, { status: 400 });
  if (arquivo.type !== "application/pdf") return Response.json({ erro: "O arquivo precisa ser PDF." }, { status: 400 });
  if (arquivo.size > TAMANHO_MAXIMO) return Response.json({ erro: "O PDF passa de 4 MB." }, { status: 400 });
  const pdf = { nome: arquivo.name, base64: Buffer.from(await arquivo.arrayBuffer()).toString("base64") };

  const encoder = new TextEncoder();
  const abort = new AbortController();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const ping = setInterval(() => controller.enqueue(encoder.encode(".")), 5000);
      try {
        const e = await extrairDespesasComIa(pdf, abort.signal);
        const competencia = new Date(`${e.periodoFim.slice(0, 7)}-01T00:00:00Z`);
        const documentos = await salvarDocumentos(supabase, `despesas/${e.periodoFim.slice(0, 7)}`, [pdf]);
        const data = { empresa: e.empresa, cnpj: e.cnpj, contas: e.contas, totalPdf: e.totalPdf, arquivos: [pdf.nome], documentos, modeloIa: MODELO_IA };
        await prisma.balanceteDespesas.upsert({ where: { competencia }, update: data, create: { competencia, ...data } });
        revalidatePath("/credito/despesas-fixas");
        controller.enqueue(encoder.encode(`\n${JSON.stringify({ competencia: e.periodoFim.slice(0, 7) })}`));
      } catch (err) {
        console.error("Despesas fixas:", err);
        const erro = err instanceof ErroExtracao ? err.message : "Falha inesperada ao processar o balancete.";
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
