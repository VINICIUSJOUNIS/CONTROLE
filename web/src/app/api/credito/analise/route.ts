// Analise de Credito: recebe o PDF do balancete e devolve, em streaming, o
// relatorio escrito pela IA (Claude) seguindo o prompt do analista senior.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const MODELO = "claude-opus-5-5";

// A chave da Anthropic cadastrada e de organizacao (sem workspace): a API exige
// o cabecalho anthropic-workspace-id. O ID nao e segredo; pode ser trocado pela
// variavel ANTHROPIC_WORKSPACE_ID na Vercel.
const WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID?.trim() || "wrkspc_01EMEck1JehNq3HA2d1qT88Z";

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

// Traduz os erros da API da Anthropic para a tela, mantendo a mensagem original.
function motivoErro(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "Chave ANTHROPIC_API_KEY inválida - confira o valor na Vercel.";
  if (e instanceof Anthropic.PermissionDeniedError) return "A chave não tem permissão para usar este modelo.";
  if (e instanceof Anthropic.RateLimitError) return "Limite de uso da API atingido - aguarde um minuto e tente de novo.";
  const msg = e instanceof Error ? e.message : String(e);
  if (/credit balance/i.test(msg)) return "Sem créditos na conta da Anthropic - adicione créditos em console.anthropic.com > Billing.";
  return `Detalhe: ${msg}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Faça login novamente.", { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return new Response("ANTHROPIC_API_KEY não configurada.", { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return new Response("Selecione um arquivo PDF.", { status: 400 });
  if (file.type !== "application/pdf") return new Response("O arquivo precisa ser um PDF.", { status: 400 });

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY.trim(),
    defaultHeaders: { "anthropic-workspace-id": WORKSPACE_ID },
  });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: "Analise este balancete." },
      ],
    },
  ];
  // O raciocinio interno do modelo tambem consome max_tokens: limite alto e
  // effort medio deixam espaco para o relatorio completo. O SDK instalado (0.68)
  // nao tipa output_config, entao o campo vai no corpo como esta.
  const abrir = (comEffort: boolean) =>
    client.messages.stream({
      model: MODELO,
      max_tokens: 64000,
      system: `${PROMPT}\n\n${FORMATO}`,
      messages,
      ...(comEffort ? { output_config: { effort: "medium" } } : {}),
    } as Anthropic.MessageStreamParams);

  let stream = abrir(true);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let escreveu = false;
      try {
        for (let tentativa = 0; ; tentativa++) {
          try {
            for await (const ev of stream) {
              if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
                escreveu = true;
                controller.enqueue(encoder.encode(ev.delta.text));
              }
            }
            break;
          } catch (e) {
            // Parametro recusado (400) antes de qualquer texto: refaz sem o effort.
            if (tentativa > 0 || escreveu || !(e instanceof Anthropic.BadRequestError)) throw e;
            console.error("Analise de credito: refazendo sem effort -", e.message);
            stream = abrir(false);
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_Relatório interrompido: limite de tamanho atingido._"));
        }
      } catch (e) {
        console.error("Analise de credito:", e);
        controller.enqueue(encoder.encode(`\n\n**Erro ao gerar a análise.** ${motivoErro(e)}`));
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
