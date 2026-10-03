// Boletim falado de Ultimas Noticias: a IA (Claude) escreve um texto curto para
// ser lido em voz alta, a partir das manchetes do dolar e do painel de cambio
// do Banco Central ja exibidos na tela. Sem ANTHROPIC_API_KEY (ou se a IA
// falhar), monta um roteiro simples com as manchetes, para a leitura nao parar.
import Anthropic from "@anthropic-ai/sdk";
import type { Noticia } from "@/lib/hedge-cambial/noticias";
import type { PainelCambio } from "@/lib/hedge-cambial/cambio-bcb";

const MODELO = "claude-opus-5-5";

const SISTEMA =
  "Voce e locutor de um boletim de radio sobre o mercado de cambio, para a mesa de uma exportadora de cafe. " +
  "Escreva o texto que sera lido em voz alta por um sintetizador de voz em portugues do Brasil: de 1 a 2 minutos " +
  "(no maximo 260 palavras), frases curtas, tom profissional e direto. Use apenas as informacoes fornecidas - " +
  "nunca invente numeros, fatos ou causas. Comece pelo que o Banco Central mostra (PTAX do dia, tendencia e Focus), " +
  "depois resuma as noticias mais relevantes agrupando as repetidas, citando a fonte quando ajudar. Escreva valores " +
  "de forma natural para a fala (por exemplo 'cinco reais e vinte e dois centavos', 'alta de zero virgula tres por cento'). " +
  "Nao use markdown, listas, emojis, siglas soletradas ou links. Termine com uma frase avisando que o boletim e " +
  "informativo e nao e recomendacao de operacao.";

function dadosParaIa(dolar: Noticia[], cambio: PainelCambio) {
  const ultimoDia = cambio.dias.filter((d) => d.boletins.length).at(-1);
  return JSON.stringify(
    {
      agora: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      banco_central: {
        ptax_ultimo_dia: ultimoDia
          ? { data: ultimoDia.data, boletins: ultimoDia.boletins.map((b) => ({ hora: b.dataHora.slice(11), tipo: b.tipo, venda: b.venda })) }
          : null,
        fechamentos_recentes: cambio.dias.filter((d) => d.fechamento !== null).slice(-6).map((d) => ({ data: d.data, fechamento: d.fechamento })),
        sinais_de_tendencia: cambio.sinais,
        focus: cambio.projecoes,
      },
      noticias: dolar.map((n) => ({ titulo: n.titulo, resumo: n.resumo, fonte: n.fonte, publicada_em: n.data })),
    },
    null,
    1
  );
}

// Roteiro sem IA: tendencia do BCB + manchetes, na ordem.
export function roteiroSimples(dolar: Noticia[], cambio: PainelCambio) {
  const partes: string[] = ["Boletim do dolar."];
  for (const s of cambio.sinais) if (s.direcao !== "SEM DADO") partes.push(`${s.nome}: ${s.direcao === "ESTAVEL" ? "estavel" : s.direcao.toLowerCase()}.`);
  if (dolar.length) partes.push("Principais noticias.");
  for (const n of dolar) partes.push(`${n.titulo}. Fonte: ${n.fonte}.`);
  partes.push("Boletim informativo, nao e recomendacao de operacao.");
  return partes.join(" ");
}

export async function gerarBoletimIa(dolar: Noticia[], cambio: PainelCambio): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY nao configurada");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // O SDK instalado (0.68) ainda nao tipa output_config/fallbacks: os campos
  // vao no corpo da requisicao como estao (effort baixo = texto curto e rapido;
  // fallbacks "default" = se o modelo recusar, o proprio servidor tenta outro).
  const params = {
    model: MODELO,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: SISTEMA,
    messages: [{ role: "user", content: `Dados de agora (JSON):\n${dadosParaIa(dolar, cambio)}\n\nEscreva o boletim.` }],
  } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming;
  let resposta: Anthropic.Beta.BetaMessage;
  try {
    resposta = await client.beta.messages.create(params);
  } catch (e) {
    // Parametro novo recusado (400): refaz no formato basico, sem os betas.
    if (!(e instanceof Anthropic.BadRequestError)) throw e;
    console.error("Boletim IA: refazendo sem betas -", e.message);
    resposta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 4000,
      system: SISTEMA,
      messages: params.messages,
    });
  }
  if (resposta.stop_reason === "refusal") throw new Error("IA recusou o pedido");
  const texto = resposta.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!texto) throw new Error("IA nao retornou texto");
  return texto;
}
