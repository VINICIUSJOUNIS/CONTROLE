// Leitura do balancete mensal pela IA: todas as contas analiticas de despesas
// operacionais (grupo 4.2) com saldo anterior, debito, credito e saldo atual.
import { z } from "zod";
import { ErroExtracao, lerPdfsComIa } from "./extracao-ia";

const SISTEMA = `Você é contador sênior. Recebe o balancete mensal de uma empresa em PDF, com as colunas Saldo Anterior, Débito, Crédito e Saldo Atual.

Extraia TODAS as contas ANALÍTICAS (último nível, as que não têm subcontas) do grupo de DESPESAS OPERACIONAIS (no plano da empresa, classificação iniciada por 4.2: despesas com vendas, administrativas, financeiras, variações monetárias passivas e outras despesas operacionais). Não inclua custos (4.1), provisão de IR/CSLL (4.3) nem contas sintéticas.

Regras:
1. codigo = código reduzido da conta (número à esquerda); classificacao = classificação completa (ex.: 4.2.2.01.000001); descricao = nome da conta, uma vez só (o PDF às vezes repete o texto).
2. Valores em reais, sem arredondar. Saldo devedor (D) é positivo e saldo credor (C) é negativo. Débito e crédito do mês sempre positivos.
3. Confira cada conta: saldoAnterior + debito − credito = saldoAtual.
4. Em totalPdf copie a linha do grupo de despesas operacionais (4.2): saldo anterior, débito, crédito e saldo atual.
5. periodoFim é a data final do período do balancete (AAAA-MM-DD).`;

const contaSchema = z.object({
  codigo: z.string(),
  classificacao: z.string(),
  descricao: z.string(),
  saldoAnterior: z.number(),
  debito: z.number(),
  credito: z.number(),
  saldoAtual: z.number(),
});
const totalSchema = z.object({ saldoAnterior: z.number(), debito: z.number(), credito: z.number(), saldoAtual: z.number() });

export const balanceteDespesasSchema = z.object({
  empresa: z.string(),
  cnpj: z.string(),
  periodoFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contas: z.array(contaSchema),
  totalPdf: totalSchema,
});

const numero = { type: "number" };
const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["empresa", "cnpj", "periodoFim", "contas", "totalPdf"],
  properties: {
    empresa: { type: "string" },
    cnpj: { type: "string" },
    periodoFim: { type: "string", description: "AAAA-MM-DD" },
    contas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["codigo", "classificacao", "descricao", "saldoAnterior", "debito", "credito", "saldoAtual"],
        properties: {
          codigo: { type: "string" },
          classificacao: { type: "string" },
          descricao: { type: "string" },
          saldoAnterior: numero,
          debito: numero,
          credito: numero,
          saldoAtual: numero,
        },
      },
    },
    totalPdf: {
      type: "object",
      additionalProperties: false,
      required: ["saldoAnterior", "debito", "credito", "saldoAtual"],
      properties: { saldoAnterior: numero, debito: numero, credito: numero, saldoAtual: numero },
    },
  },
};

export async function extrairDespesasComIa(pdf: { nome: string; base64: string }, signal?: AbortSignal) {
  const json = await lerPdfsComIa([pdf], SISTEMA, "Extraia as contas analíticas de despesas operacionais deste balancete.", jsonSchema, signal);
  const parsed = balanceteDespesasSchema.safeParse(json);
  if (!parsed.success) throw new ErroExtracao(`Resposta da IA fora do formato: ${parsed.error.issues[0]?.message ?? ""}`);
  return parsed.data;
}
