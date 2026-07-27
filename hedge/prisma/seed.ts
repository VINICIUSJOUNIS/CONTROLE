import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Parseia "YYYY-MM-DD" como data local ao meio-dia (mesma logica de src/lib/date.ts),
// evitando o shift de fuso horario no round-trip com colunas @db.Date.
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

type SeedRow = {
  contractDate: string;
  vencimento: string;
  side: "COMPRA" | "VENDA" | null;
  valorUsd: number;
  liquidacaoParcialUsd: number;
  nivelCompra: number;
  nivelVenda: number;
  desagioValor: number;
  totalReais: number;
  corretora: string;
  contractType: "NDF" | "TRAVA";
  status: "A_LIQUIDAR" | "LIQUIDADA";
  observacao: string | null;
};

const palette = [
  "#1c8388",
  "#12b76a",
  "#f79009",
  "#f04438",
  "#7a5af8",
  "#0891b2",
  "#db2777",
  "#000000",
  "#8b5cf6",
  "#65a30d",
  "#0284c7",
];

async function main() {
  const rows: SeedRow[] = JSON.parse(
    readFileSync(join(__dirname, "seed-data.json"), "utf-8")
  );

  console.log(`Lidas ${rows.length} operacoes do arquivo seed-data.json`);

  console.log("Limpando dados existentes...");
  await prisma.hedgeOperation.deleteMany();
  await prisma.corretora.deleteMany();

  const corretoraNames = Array.from(new Set(rows.map((r) => r.corretora))).sort();
  console.log("Criando corretoras...", corretoraNames);
  const corretorasByName = new Map<string, string>();
  for (let i = 0; i < corretoraNames.length; i++) {
    const created = await prisma.corretora.create({
      data: { name: corretoraNames[i], color: palette[i % palette.length] },
    });
    corretorasByName.set(corretoraNames[i], created.id);
  }

  console.log("Criando operacoes de hedge...");
  for (const row of rows) {
    const corretoraId = corretorasByName.get(row.corretora);
    if (!corretoraId) continue;

    await prisma.hedgeOperation.create({
      data: {
        corretoraId,
        contractType: row.contractType,
        side: row.side,
        contractDate: parseLocalDate(row.contractDate),
        vencimento: parseLocalDate(row.vencimento),
        valorUsd: row.valorUsd,
        liquidacaoParcialUsd: row.liquidacaoParcialUsd,
        nivelCompra: row.nivelCompra,
        nivelVenda: row.nivelVenda,
        desagioValor: row.desagioValor,
        totalReais: row.totalReais,
        status: row.status,
        observacao: row.observacao,
      },
    });
  }

  console.log("Seed concluido.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
