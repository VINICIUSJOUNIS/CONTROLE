// Analise de Credito: recebe o PDF do balancete e devolve, em streaming, o
// relatorio escrito pela IA (Claude) seguindo o prompt do analista senior.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const MODELO = "claude-opus-5-5";

const PROMPT =
  "Você é um analista financeiro sênior. Ao receber um PDF de balancete, extraia e apresente: resumo executivo, " +
  "balanço patrimonial simplificado, contas a receber (aging e concentração), contas a pagar (fornecedores, impostos, " +
  "obrigações financeiras), fluxo de caixa e capital de giro, endividamento (curto versus longo prazo, custo da dívida), " +
  "indicadores-chave (margens, liquidez, giro de estoque se houver), análise crítica e principais riscos e uma conclusão " +
  "executiva com insights e recomendações. Regras: não invente dados ausentes. Se algo não estiver no documento, " +
  "sinalize como não identificado.";

// Formato da resposta, para a tela conseguir renderizar o relatorio.
const FORMATO =
  "Responda em português do Brasil, em Markdown: um titulo '## ' para cada secao, na ordem pedida, tabelas Markdown " +
  "para balanço, contas e indicadores, listas com '- ' e valores em R$ no padrão brasileiro.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Faça login novamente.", { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY não configurada.", { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return new Response("Selecione um arquivo PDF.", { status: 400 });
  if (file.type !== "application/pdf") return new Response("O arquivo precisa ser um PDF.", { status: 400 });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = client.messages.stream({
    model: MODELO,
    max_tokens: 16000,
    system: `${PROMPT}\n\n${FORMATO}`,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Analise este balancete." },
        ],
      },
    ],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(ev.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_Relatório interrompido: limite de tamanho atingido._"));
        }
      } catch (e) {
        console.error("Analise de credito:", e);
        controller.enqueue(encoder.encode("\n\n**Erro ao gerar a análise.** Tente novamente."));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
