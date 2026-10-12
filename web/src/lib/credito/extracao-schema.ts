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

// JSON Schema equivalente para o structured output da API (todos os objetos
// com additionalProperties: false e todas as propriedades obrigatorias).
const objNumeros = (chaves: readonly string[]) => ({
  type: "object",
  additionalProperties: false,
  required: [...chaves],
  properties: Object.fromEntries(chaves.map((k) => [k, { type: "number" }])),
});
const data = { type: "string", description: "Data no formato AAAA-MM-DD" };
const dataOuNull = { anyOf: [data, { type: "null" }] };

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
    balanco: objNumeros(chavesBalanco),
    balancoAnterior: { anyOf: [objNumeros(chavesBalanco), { type: "null" }] },
    dre: objNumeros(chavesDre),
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
