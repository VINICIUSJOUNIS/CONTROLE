// Leitura do Balanco Patrimonial e da DRE em PDF pela IA (Claude), devolvendo
// os valores ja reclassificados nos campos padronizados + as contas de origem.
import Anthropic from "@anthropic-ai/sdk";
import { CAMPOS_BALANCO, CAMPOS_DRE, ROTULO_GRUPO } from "./campos";
import { extracaoJsonSchema, extracaoSchema, type Extracao } from "./extracao-schema";

export const MODELO_IA = "claude-opus-5-5";

// A chave da Anthropic cadastrada e de organizacao (sem workspace): a API exige
// o cabecalho anthropic-workspace-id. O ID nao e segredo; pode ser trocado pela
// variavel ANTHROPIC_WORKSPACE_ID na Vercel.
const WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID?.trim() || "wrkspc_01EMEck1JehNq3HA2d1qT88Z";

const listaCampos = () => {
  const balanco = CAMPOS_BALANCO.map((c) => `- ${c.chave} (${ROTULO_GRUPO[c.grupo]} / ${c.rotulo}): ${c.regra}`).join("\n");
  const dre = CAMPOS_DRE.map((c) => `- ${c.chave} (${c.rotulo}): ${c.regra}`).join("\n");
  return `CAMPOS DO BALANÇO:\n${balanco}\n\nCAMPOS DA DRE:\n${dre}`;
};

const SISTEMA = `Você é contador sênior e analista de crédito sênior de banco, especialista em exportadoras de café. Recebe o Balanço Patrimonial e a DRE de um mês em PDF (podem vir em um ou dois arquivos) e reclassifica todas as contas no plano padronizado abaixo, usado pelo sistema para calcular os indicadores de crédito.

${listaCampos()}

REGRAS:
1. Valores em reais (não em milhares), com sinal conforme a regra de cada campo. Leia "D"/"C" e parênteses do PDF: no ativo, saldo credor reduz; no passivo, saldo devedor reduz.
2. Cada conta do balanço entra em exatamente um campo. A soma dos campos do ativo (com a depreciação acumulada subtraída) deve igualar o total do ativo do PDF, e passivo + PL deve igualar o total do passivo do PDF. Se o PL ainda não tiver o resultado do exercício, não invente: o sistema trata a diferença.
3. "balanco" é a coluna da data do balanço (saldo atual). Se o PDF trouxer a coluna do mês anterior (saldo anterior), preencha "balancoAnterior" com ela pelos mesmos critérios; senão null.
4. "dre" é a coluna do período do mês. Defina dreTipo: "mensal" se a coluna for só o mês, "acumulado" se for o acumulado do ano até a data. Confira pela variação de lucros acumulados no PL quando houver saldo anterior. Ignore colunas de períodos anteriores da DRE.
5. ACC/ACE é sempre dívida financeira (accAce). Variação cambial/monetária vai sempre em variacaoCambialLiquida, mesmo que a contabilidade a apresente dentro de custos ou receitas. IRPJ/CSLL a recolher vão em irCsRecolher, separados dos demais impostos.
6. Em "origens", para cada campo diferente de zero (balanço atual e DRE), liste as contas do PDF que o compõem com código de classificação, descrição e valor com o sinal usado no campo. Use a conta sintética mais agregada que componha o campo inteiro; detalhe contas analíticas só quando o campo usar parte de um grupo. A soma das contas deve dar o valor do campo.
7. Em "conferenciaPdf", copie do PDF o total do ativo, o total do passivo + PL, o total do ativo anterior (ou null) e o lucro líquido do período da DRE.
8. Em "observacoes", explique em português, de forma objetiva, cada reclassificação relevante que um analista de crédito precisa saber (sobregiro compensado em bancos, variação cambial reclassificada, contas redutoras atípicas, transações com partes relacionadas, ajustes de exercícios anteriores, depreciação não destacada etc.).
9. Datas no formato AAAA-MM-DD. Não invente valores: conta inexistente é 0.`;

function motivoErro(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "Chave ANTHROPIC_API_KEY inválida - confira o valor na Vercel.";
  if (e instanceof Anthropic.PermissionDeniedError) return "A chave não tem permissão para usar este modelo.";
  if (e instanceof Anthropic.RateLimitError) return "Limite de uso da API atingido - aguarde um minuto e tente de novo.";
  const msg = e instanceof Error ? e.message : String(e);
  if (/credit balance/i.test(msg)) return "Sem créditos na conta da Anthropic - adicione créditos em console.anthropic.com > Billing.";
  return msg;
}

export class ErroExtracao extends Error {}

export async function extrairComIa(pdfs: { nome: string; base64: string }[], signal?: AbortSignal): Promise<Extracao> {
  const chave = process.env.ANTHROPIC_API_KEY?.trim();
  if (!chave) throw new ErroExtracao("ANTHROPIC_API_KEY não configurada.");
  const client = new Anthropic({ apiKey: chave, defaultHeaders: { "anthropic-workspace-id": WORKSPACE_ID } });

  const content: Anthropic.ContentBlockParam[] = [
    ...pdfs.map(
      (p): Anthropic.ContentBlockParam => ({
        type: "document",
        title: p.nome,
        source: { type: "base64", media_type: "application/pdf", data: p.base64 },
      })
    ),
    { type: "text", text: "Extraia e reclassifique o Balanço Patrimonial e a DRE destes PDFs conforme as regras." },
  ];

  // O SDK instalado (0.68) nao tipa output_config nem fallbacks; os campos vao
  // no corpo como estao. Structured output garante o JSON no formato do schema.
  const base = {
    model: MODELO_IA,
    max_tokens: 64000,
    system: SISTEMA,
    messages: [{ role: "user", content }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: extracaoJsonSchema } },
  };

  let final: Anthropic.Message;
  try {
    try {
      // Fallback do servidor: se o modelo recusar, outro modelo refaz na mesma chamada.
      const stream = client.beta.messages.stream(
        { ...base, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming,
        { signal }
      );
      final = (await stream.finalMessage()) as unknown as Anthropic.Message;
    } catch (e) {
      if (!(e instanceof Anthropic.BadRequestError)) throw e;
      console.error("Analise de credito: refazendo sem fallback -", e.message);
      final = await client.messages.stream(base as unknown as Anthropic.MessageStreamParams, { signal }).finalMessage();
    }
  } catch (e) {
    throw new ErroExtracao(motivoErro(e));
  }

  if (final.stop_reason === "refusal") throw new ErroExtracao("A IA recusou a leitura do documento.");
  if (final.stop_reason === "max_tokens") throw new ErroExtracao("A resposta da IA passou do limite de tamanho.");
  const texto = final.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text;
  if (!texto) throw new ErroExtracao("A IA não devolveu dados.");

  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new ErroExtracao("A resposta da IA não é um JSON válido.");
  }
  const parsed = extracaoSchema.safeParse(json);
  if (!parsed.success) throw new ErroExtracao(`Resposta da IA fora do formato: ${parsed.error.issues[0]?.message ?? ""}`);
  return parsed.data as Extracao;
}
