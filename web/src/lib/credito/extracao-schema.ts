import { z } from "zod";
import { CAMPOS_BALANCO, CAMPOS_DRE, DRE_TIPOS, type Balanco, type Dre } from "./campos";

// Formato que a IA devolve ao ler o Balanco Patrimonial + DRE em PDF. O mesmo
// formato e gravado no banco (tabela analises_credito).

const numeros = (chaves: readonly string[]) =>
  z.object(Object.fromEntries(chaves.map((k) => [k, z.number()])) as Record<string, z.ZodNumber>);

const chavesBalanco = CAMPOS_BALANCO.map((c) => c.chave);
const chavesDre = CAMPOS_DRE.map((c) => c.chave);

const contaSchema = z.object({ codigo: z.string(), descricao: z.string(), valor: z.number() });

export const extracaoSchema = z.object({
  empresa: z.string(),
  cnpj: z.string(),
  dataBalanco: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataBalancoAnterior: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dreTipo: z.enum(DRE_TIPOS),
  dreInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dreFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  balanco: numeros(chavesBalanco),
  balancoAnterior: numeros(chavesBalanco).nullable(),
  dre: numeros(chavesDre),
  origens: z.array(z.object({ campo: z.string(), contas: z.array(contaSchema) })),
  conferenciaPdf: z.object({
    totalAtivo: z.number(),
    totalPassivoPl: z.number(),
    totalAtivoAnterior: z.number().nullable(),
    lucroLiquido: z.number(),
  }),
  observacoes: z.array(z.string()),
});

export type Extracao = Omit<z.infer<typeof extracaoSchema>, "balanco" | "balancoAnterior" | "dre"> & {
  balanco: Balanco;
  balancoAnterior: Balanco | null;
  dre: Dre;
};

// JSON Schema para o structured output da API. Balanco/DRE vao como listas
// {campo, valor} em vez de objetos com as 38/16 chaves obrigatorias: objetos
// tao grandes (ainda mais repetidos no balancoAnterior) estouravam o limite de
// tamanho da gramatica da API ("The compiled grammar is too large").
// normalizarRespostaIa monta os objetos completos (campo ausente = 0) antes
// de validar com extracaoSchema.
const listaValores = (chaves: readonly string[]) => ({
  type: "array",
  description: "Um item por campo com valor diferente de zero; campos ausentes valem 0.",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["campo", "valor"],
    properties: {
      campo: { type: "string", enum: [...chaves] },
      valor: { type: "number" },
    },
  },
});
const data = { type: "string", description: "Data no formato AAAA-MM-DD" };
const dataOuNull = { anyOf: [data, { type: "null" }] };

type ItemValor = { campo: string; valor: number };
const paraObjeto = (chaves: readonly string[], lista: unknown) => {
  if (!Array.isArray(lista)) return lista;
  const obj: Record<string, number> = Object.fromEntries(chaves.map((k) => [k, 0]));
  for (const item of lista as ItemValor[]) {
    if (item && item.campo in obj && typeof item.valor === "number") obj[item.campo] += item.valor;
  }
  return obj;
};

// Converte as listas {campo, valor} da resposta da IA nos objetos de extracaoSchema.
export function normalizarRespostaIa(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const r = json as Record<string, unknown>;
  return {
    ...r,
    balanco: paraObjeto(chavesBalanco, r.balanco),
    balancoAnterior: r.balancoAnterior == null ? null : paraObjeto(chavesBalanco, r.balancoAnterior),
    dre: paraObjeto(chavesDre, r.dre),
  };
}

export const extracaoJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "empresa",
    "cnpj",
    "dataBalanco",
    "dataBalancoAnterior",
    "dreTipo",
    "dreInicio",
    "dreFim",
    "balanco",
    "balancoAnterior",
    "dre",
    "origens",
    "conferenciaPdf",
    "observacoes",
  ],
  properties: {
    empresa: { type: "string" },
    cnpj: { type: "string" },
    dataBalanco: data,
    dataBalancoAnterior: dataOuNull,
    dreTipo: { type: "string", enum: [...DRE_TIPOS] },
    dreInicio: dataOuNull,
    dreFim: data,
    balanco: listaValores(chavesBalanco),
    balancoAnterior: { anyOf: [listaValores(chavesBalanco), { type: "null" }] },
    dre: listaValores(chavesDre),
    origens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["campo", "contas"],
        properties: {
          campo: { type: "string", enum: [...chavesBalanco, ...chavesDre] },
          contas: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["codigo", "descricao", "valor"],
              properties: {
                codigo: { type: "string" },
                descricao: { type: "string" },
                valor: { type: "number" },
              },
            },
          },
        },
      },
    },
    conferenciaPdf: {
      type: "object",
      additionalProperties: false,
      required: ["totalAtivo", "totalPassivoPl", "totalAtivoAnterior", "lucroLiquido"],
      properties: {
        totalAtivo: { type: "number" },
        totalPassivoPl: { type: "number" },
        totalAtivoAnterior: { anyOf: [{ type: "number" }, { type: "null" }] },
        lucroLiquido: { type: "number" },
      },
    },
    observacoes: { type: "array", items: { type: "string" } },
  },
} as const;
