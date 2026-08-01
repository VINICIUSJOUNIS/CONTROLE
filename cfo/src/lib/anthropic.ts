import Anthropic from "@anthropic-ai/sdk";
import { financialStatementFieldsSchema, financialStatementFieldKeys, type FinancialStatementFields } from "./financial/schema";

export class ExtractionError extends Error {}

const globalForAnthropic = globalThis as unknown as { anthropic?: Anthropic };

// Instanciado sob demanda (nao no import do modulo) para o app funcionar sem
// ANTHROPIC_API_KEY configurada - os recursos de IA (extracao de PDF, analise
// de riscos) sao opcionais e so devem falhar quando efetivamente usados.
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ExtractionError(
      "ANTHROPIC_API_KEY não configurada. Adicione a chave em .env.local para usar recursos de IA."
    );
  }
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return globalForAnthropic.anthropic;
}

const EXTRACTION_MODEL = "claude-sonnet-4-5";

// JSON Schema do tool de extracao - espelha financialStatementFieldsSchema.
// Numeros monetarios sempre em reais (nao em milhares), sinal negativo quando
// o balancete apresentar valor negativo (ex: resultado financeiro negativo).
const numberField = (description: string) => ({ type: "number", description });
const nullableNumberField = (description: string) => ({
  type: ["number", "null"],
  description,
});

const extractionTool: Anthropic.Tool = {
  name: "registrar_balancete",
  description:
    "Registra os valores extraidos do balanco patrimonial e da DRE presentes no PDF, ja normalizados em reais.",
  input_schema: {
    type: "object",
    properties: {
      periodLabel: { type: "string", description: 'Rotulo do periodo, ex: "2025 T4" ou "2025 Anual"' },
      referenceDate: { type: "string", description: "Data de fechamento do periodo, formato AAAA-MM-DD" },
      periodDays: { type: "integer", description: "Quantidade de dias cobertos pelo periodo (ex: 90, 180, 365)" },

      // DRE
      receitaBruta: numberField("Receita Operacional Bruta"),
      deducoes: numberField("Deducoes da receita (impostos sobre vendas, devolucoes, abatimentos)"),
      receitaLiquida: numberField("Receita Operacional Liquida"),
      cmv: numberField("Custo das Mercadorias/Produtos/Servicos Vendidos (CMV/CPV/CSV)"),
      lucroBruto: numberField("Lucro Bruto (Receita Liquida - CMV)"),
      outrasReceitasOperacionais: numberField("Outras Receitas Operacionais"),
      despesasGerais: numberField("Despesas Gerais e Administrativas"),
      despesasComerciais: numberField("Despesas Comerciais / com Vendas"),
      despesasTributarias: numberField("Despesas Tributarias (tributos sobre operacao, exceto IR/CSLL)"),
      depreciacaoAmortizacao: numberField("Depreciacao e Amortizacao do periodo"),
      outrasDespesasOperacionais: numberField("Outras Despesas Operacionais nao classificadas acima"),
      resultadoAtividade: numberField(
        "Resultado da Atividade / EBIT — lucro antes do resultado financeiro e do IR (Lucro Bruto + Outras Receitas - Despesas Operacionais - Depreciacao)"
      ),
      receitasFinanceiras: numberField("Receitas Financeiras (juros ativos, rendimentos de aplicacoes)"),
      despesasFinanceiras: numberField("Despesas Financeiras (juros passivos, IOF, tarifas bancarias)"),
      variacaoCambial: numberField("Variacao Monetaria/Cambial Liquida (positiva ou negativa)"),
      resultadoNaoOperacional: numberField("Receitas/Despesas Nao Operacionais (eventos nao recorrentes)"),
      impostoRenda: numberField("IRPJ e CSLL sobre o lucro do periodo"),
      participacoes: numberField("Participacoes de administradores/empregados/debentures no lucro"),
      lucroLiquido: numberField("Lucro Liquido do periodo"),

      // Ativo Circulante
      caixaEquivalentes: numberField("Caixa, bancos e aplicacoes financeiras de liquidez imediata"),
      titulosValoresMobiliarios: numberField("Titulos e Valores Mobiliarios de curto prazo"),
      contasReceberClientes: numberField("Contas a Receber de Clientes (curto prazo, operacional)"),
      estoques: numberField("Estoques (materia-prima, produtos em processo, produtos acabados)"),
      adiantamentoFornecedores: numberField("Adiantamentos a Fornecedores"),
      outrosAtivosOperacionaisCirc: numberField("Outros ativos circulantes de natureza operacional (tributos a recuperar, despesas antecipadas)"),
      outrosAtivosNaoOperacionaisCirc: numberField("Outros ativos circulantes de natureza nao operacional"),

      // Ativo Nao Circulante
      contasReceberColigadas: numberField("Contas a Receber de Coligadas/Controladas (longo prazo)"),
      investimentos: numberField("Investimentos (participacoes societarias permanentes)"),
      imobilizado: numberField("Imobilizado (terrenos, predios, maquinas, equipamentos), liquido de depreciacao acumulada"),
      intangivel: numberField("Intangivel (marcas, patentes, softwares, goodwill), liquido de amortizacao acumulada"),
      outrosAtivosNaoCirculantes: numberField("Demais itens do Ativo Nao Circulante (realizavel a longo prazo diverso)"),

      // Passivo Circulante
      fornecedores: numberField("Fornecedores a pagar"),
      salariosEncargos: numberField("Salarios, ferias, 13o e encargos sociais a pagar"),
      impostosContribuicoes: numberField("Impostos e contribuicoes a pagar (exceto IR/CSLL, ver irAPagar)"),
      emprestimosCurtoPrazo: numberField("Emprestimos e financiamentos bancarios de curto prazo"),
      irAPagar: numberField("IRPJ e CSLL a pagar"),
      emprestimosColigadasCP: numberField("Emprestimos de coligadas/controladas/socios de curto prazo"),
      dividendosAPagar: numberField("Dividendos e Juros sobre Capital Proprio a pagar"),
      adiantamentosClientes: numberField("Adiantamentos recebidos de clientes"),
      outrosPassivosCirc: numberField("Demais passivos circulantes nao classificados acima"),

      // Passivo Nao Circulante
      emprestimosLongoPrazo: numberField("Emprestimos e financiamentos bancarios de longo prazo"),
      outrosPassivosNaoCirc: numberField("Demais passivos nao circulantes (provisoes, tributos parcelados, etc)"),

      // Patrimonio Liquido
      capitalSocial: numberField("Capital Social Integralizado"),
      reservas: numberField("Reservas de Capital e de Lucros"),
      lucrosPrejuizosAcumulados: numberField("Lucros ou Prejuizos Acumulados"),
      outrosResultadosAbrangentes: numberField("Outros Resultados Abrangentes / Ajustes de Avaliacao Patrimonial"),

      ativosMoedaEstrangeira: nullableNumberField(
        "Ativos indexados/denominados em moeda estrangeira, se o balancete discriminar (ex: contas a receber de exportacao). Use null se nao houver essa discriminacao."
      ),
      passivosMoedaEstrangeira: nullableNumberField(
        "Passivos indexados/denominados em moeda estrangeira, se o balancete discriminar (ex: emprestimos em USD). Use null se nao houver essa discriminacao."
      ),
    },
    required: financialStatementFieldKeys.filter(
      (k) => k !== "ativosMoedaEstrangeira" && k !== "passivosMoedaEstrangeira"
    ),
  },
};

export async function extractFinancialStatement(
  pdfBase64: string
): Promise<FinancialStatementFields> {
  const message = await getClient().messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    system:
      "Voce e um analista financeiro extraindo dados estruturados de balancos e balancetes contabeis brasileiros. " +
      "Leia o documento com atencao, identifique a DRE e o Balanco Patrimonial, e preencha todos os campos do tool " +
      "com os valores encontrados, em reais (nao em milhares). Se um valor nao aparecer explicitamente mas puder " +
      "ser calculado a partir de outros (ex: Lucro Bruto = Receita Liquida - CMV), calcule-o. Nunca invente valores " +
      "que nao tenham base no documento.",
    tools: [extractionTool],
    tool_choice: { type: "tool", name: "registrar_balancete" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          {
            type: "text",
            text: "Extraia os dados do balanco/balancete deste PDF usando o tool registrar_balancete.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new ExtractionError("A IA nao retornou os dados extraidos no formato esperado.");
  }

  const parsed = financialStatementFieldsSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new ExtractionError(
      `Dados extraidos invalidos: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }

  return parsed.data;
}

export type RiskInsights = {
  geradoEm: string;
  riscos: string[];
};

export async function generateRiskInsights(indicatorsSummary: Record<string, unknown>): Promise<RiskInsights> {
  const message = await getClient().messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 1024,
    system:
      "Voce e um CFO experiente revisando os indicadores financeiros de uma empresa. Com base nos numeros " +
      "fornecidos (em JSON), liste de 3 a 5 riscos ou pontos de atencao concretos e acionaveis para a diretoria " +
      "(ex: alavancagem, liquidez, deterioracao do ciclo financeiro, compressao de margem, exposicao cambial). " +
      "Responda em portugues, cada risco em uma frase curta e direta. Nao repita os numeros, interprete-os.",
    messages: [
      {
        role: "user",
        content: `Indicadores do periodo:\n${JSON.stringify(indicatorsSummary, null, 2)}\n\nListe os principais riscos, um por linha, sem numeracao ou marcadores.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const riscos = text
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);

  return { geradoEm: new Date().toISOString(), riscos };
}
