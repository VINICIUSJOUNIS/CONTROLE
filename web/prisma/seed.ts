import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const banks = [
  { name: "Santander", color: "#EC0000" },
  { name: "Itau BBA", color: "#EC7000" },
  { name: "Bradesco", color: "#CC092F" },
  { name: "Banco do Brasil", color: "#F9E300" },
  { name: "Safra", color: "#00693E" },
  { name: "Citibank", color: "#003B70" },
];

const purposes = [
  "Capital de giro",
  "Expansao industrial",
  "Compra de maquinario",
  "Reforco de caixa",
  "Financiamento de exportacao",
];
const indexers = ["CDI", "SOFR", "PRE_FIXADO", "SELIC"] as const;
const amortizations = ["PRICE", "SAC", "BULLET"] as const;

const exporters = [
  "Agroverde Exportadora",
  "Metaltech do Brasil",
  "Cafe Sul Trading",
  "Textil Norte",
  "MineraCorp",
];
const foreignClients = [
  "Global Foods Inc.",
  "EuroSteel GmbH",
  "Nordic Coffee AB",
  "Atlas Textiles LLC",
  "Pacific Metals Co.",
];
const countries = ["Estados Unidos", "Alemanha", "Suecia", "Estados Unidos", "China"];

function isoDate(d: Date) {
  return d;
}

async function main() {
  console.log("Limpando dados existentes...");
  await prisma.accOperation.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.bank.deleteMany();

  console.log("Criando bancos...");
  const createdBanks = await Promise.all(
    banks.map((b) => prisma.bank.create({ data: b }))
  );

  console.log("Criando emprestimos...");
  for (let i = 0; i < 18; i++) {
    const bank = createdBanks[i % createdBanks.length];
    const contractedValue = 800_000 + ((i * 137_000) % 4_200_000);
    const monthsAgo = 2 + ((i * 5) % 22);
    const contractDate = new Date(2026, 6 - monthsAgo, 5 + (i % 20));
    const installments = [12, 24, 36, 48][i % 4];
    const status = i % 9 === 0 ? "EM_ATRASO" : i % 5 === 0 ? "LIQUIDADO" : "ATIVO";

    await prisma.loan.create({
      data: {
        bankId: bank.id,
        contractNumber: `${bank.name.slice(0, 3).toUpperCase()}-${2023 + (i % 3)}-${1000 + i}`,
        purpose: purposes[i % purposes.length],
        contractedValue,
        netValue: Math.round(contractedValue * 0.985),
        interestRate: Number((11.5 + ((i * 37) % 500) / 100).toFixed(2)),
        indexer: indexers[i % indexers.length],
        spread: Number((2.2 + (i % 5) * 0.35).toFixed(2)),
        amortizationSystem: amortizations[i % amortizations.length],
        contractDate: isoDate(contractDate),
        firstDueDate: isoDate(new Date(contractDate.getFullYear(), contractDate.getMonth() + 1, 5)),
        lastDueDate: isoDate(
          new Date(contractDate.getFullYear(), contractDate.getMonth() + installments, 5)
        ),
        installments,
        periodicity: i % 6 === 0 ? "Trimestral" : "Mensal",
        guarantee: i % 3 === 0 ? "Aval dos socios" : i % 3 === 1 ? "Recebiveis" : "Sem garantia",
        status,
      },
    });
  }

  console.log("Criando operacoes de ACC...");
  for (let i = 0; i < 22; i++) {
    const bank = createdBanks[(i + 2) % createdBanks.length];
    const currency = i % 4 === 0 ? "EUR" : "USD";
    const monthsAgo = 1 + ((i * 4) % 20);
    const contractDate = new Date(2026, 6 - monthsAgo, 3 + (i % 25));
    const contractedValueForeign = 150_000 + ((i * 23_000) % 900_000);
    const ptaxContracting = 5.05 + Math.sin(i / 3) * 0.15 + monthsAgo * 0.01;
    const spotRate = ptaxContracting - 0.02;
    const closingRate = ptaxContracting + 0.02 + (i % 3) * 0.01;
    const ptaxSettlement = ptaxContracting + Math.cos(i / 2) * 0.08;
    const receivedValueBRL = Math.round(contractedValueForeign * spotRate);
    const status = i % 10 === 0 ? "EM_ATRASO" : i % 4 === 0 ? "LIQUIDADO" : "EM_ABERTO";

    await prisma.accOperation.create({
      data: {
        bankId: bank.id,
        accNumber: `ACC${2023 + (i % 3)}${500 + i}`,
        exchangeContractNumber: `CC-${10000 + i * 7}`,
        exporter: exporters[i % exporters.length],
        foreignClient: foreignClients[i % foreignClients.length],
        invoice: `INV-${9000 + i * 3}`,
        country: countries[i % countries.length],
        currency,
        invoiceValue: contractedValueForeign,
        contractedValueForeign,
        receivedValueBRL,
        spotRate: Number(spotRate.toFixed(4)),
        closingRate: Number(closingRate.toFixed(4)),
        ptaxContracting: Number(ptaxContracting.toFixed(4)),
        ptaxSettlement: Number(ptaxSettlement.toFixed(4)),
        contractDate: isoDate(contractDate),
        closingDate: isoDate(new Date(contractDate.getFullYear(), contractDate.getMonth() + 2, 10)),
        settlementDate: isoDate(
          new Date(contractDate.getFullYear(), contractDate.getMonth() + 2, 15)
        ),
        interestRate: Number((4.2 + (i % 6) * 0.3).toFixed(2)),
        iof: Number((contractedValueForeign * spotRate * 0.0038).toFixed(2)),
        exchangeSpread: Number((closingRate - spotRate).toFixed(4)),
        bankFees: Number((800 + (i % 5) * 150).toFixed(2)),
        status,
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
