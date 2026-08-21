// Importa os contratos de venda no mercado externo da planilha
// "CONTROLE DE RECEBIMENTO MERCADO EXTERNO.xlsx" (aba RECEBIMENTOS EXTERNOS)
// para o modulo de Contratos do Hedge. Idempotente: contratos ja existentes
// (mesmo contractNumber) sao ignorados.
//
// Uso: npx tsx scripts/import-recebimentos.ts

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import data from "./data/recebimentos-2026.json";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const countryFix: Record<string, string> = {
  "COREA DO SUL": "Coreia do Sul",
  "TURQUIA": "Turquia",
  "ESTADOS UNIDOS": "Estados Unidos",
  "SIRIA": "Siria",
  "ITALIA": "Italia",
  "ESPANHA": "Espanha",
  "DINAMARCA": "Dinamarca",
  "RUSSIA": "Russia",
  "AUSTRALIA": "Australia",
  "LIBANO": "Libano",
};

function normalizeCountry(raw: string): string {
  return countryFix[raw.toUpperCase()] ?? raw;
}

function inferStatus(dataEmbarque: string | null, previsaoChegada: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  if (!dataEmbarque) return "ASSINATURA_CONTRATO" as const;
  if (previsaoChegada && previsaoChegada < today) return "ENVIO_BL_ORIGINAL_TELEX" as const;
  return "RECEBIMENTO_BL" as const;
}

async function main() {
  let created = 0;
  let skipped = 0;
  let clientesCriados = 0;

  for (const row of data) {
    const existing = await prisma.contratoExportacao.findUnique({
      where: { contractNumber: row.contrato },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const country = normalizeCountry(row.pais);

    let cliente = await prisma.cliente.findUnique({ where: { name: row.cliente } });
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: { name: row.cliente, country },
      });
      clientesCriados++;
    }

    await prisma.contratoExportacao.create({
      data: {
        contractNumber: row.contrato,
        clienteId: cliente.id,
        country,
        valorUsd: row.faturaUsd,
        dataEmbarque: row.dataEmbarque ? new Date(row.dataEmbarque) : null,
        dataChegada: row.previsaoChegada ? new Date(row.previsaoChegada) : null,
        status: inferStatus(row.dataEmbarque, row.previsaoChegada),
        quantSacas: row.quantSacas ?? null,
        adiantamentoUsd: row.adto ?? 0,
        dataAdiantamento: row.dataAdto ? new Date(row.dataAdto) : null,
        financiadoPelaRts: row.financPelaRts,
        valorFinanciadoRtsUsd: row.valorFinanc ?? 0,
        dataLiberacaoFinanciamentoRts: row.dataLibFinanc ? new Date(row.dataLibFinanc) : null,
        previsaoPagamentoCliente: row.previsaoPgtoCliente ? new Date(row.previsaoPgtoCliente) : null,
        saldoAReceberRtsUsd: row.saldoAReceberRts ?? 0,
        valorRecebidoRtsUsd: row.valorRecebidoRts ?? 0,
        dataRecebimentoRts: row.dataRecebimentoRts ? new Date(row.dataRecebimentoRts) : null,
        obsRecebimento: row.obs ?? null,
      },
    });
    created++;
  }

  console.log(`Contratos criados: ${created}`);
  console.log(`Contratos ja existentes (pulados): ${skipped}`);
  console.log(`Clientes novos criados: ${clientesCriados}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
