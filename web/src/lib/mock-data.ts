export type Bank = {
  id: string;
  name: string;
  color: string;
};

export type LoanStatus = "Ativo" | "Liquidado" | "Em atraso";
export type AccStatus = "Em aberto" | "Liquidado" | "Em atraso";

export type Loan = {
  id: string;
  bankId: string;
  contractNumber: string;
  modality: "Emprestimo";
  purpose: string;
  contractedValue: number;
  netValue: number;
  interestRate: number;
  indexer: "CDI" | "SOFR" | "Pre-fixado" | "SELIC";
  spread: number;
  amortizationSystem: "Price" | "SAC" | "Bullet";
  contractDate: string;
  firstDueDate: string;
  lastDueDate: string;
  installments: number;
  periodicity: "Mensal" | "Trimestral";
  guarantee: string;
  status: LoanStatus;
};

export type AccOperation = {
  id: string;
  bankId: string;
  accNumber: string;
  exchangeContractNumber: string;
  exporter: string;
  foreignClient: string;
  invoice: string;
  country: string;
  currency: "USD" | "EUR";
  invoiceValue: number;
  contractedValueForeign: number;
  receivedValueBRL: number;
  spotRate: number;
  closingRate: number;
  ptaxContracting: number;
  ptaxSettlement: number;
  contractDate: string;
  closingDate: string;
  settlementDate: string;
  interestRate: number;
  iof: number;
  exchangeSpread: number;
  bankFees: number;
  status: AccStatus;
};

export type RatePoint = {
  month: string;
  loanAvgRate: number;
  accAvgRate: number;
  ptax: number;
  spotAvg: number;
  closingAvg: number;
  cambialSpread: number;
  financialCost: number;
};

export const banks: Bank[] = [
  { id: "santander", name: "Santander", color: "#EC0000" },
  { id: "itau", name: "Itau BBA", color: "#EC7000" },
  { id: "bradesco", name: "Bradesco", color: "#CC092F" },
  { id: "bb", name: "Banco do Brasil", color: "#F9E300" },
  { id: "safra", name: "Safra", color: "#00693E" },
  { id: "citi", name: "Citibank", color: "#003B70" },
];

function monthsBack(n: number): string[] {
  const now = new Date(2026, 6, 1);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const months = monthsBack(24);

export const rateHistory: RatePoint[] = months.map((month, i) => {
  const t = i / (months.length - 1);
  const wave = Math.sin(i / 3.2) * 0.35;
  const loanAvgRate = 15.8 - t * 2.6 + wave * 0.6;
  const accAvgRate = 5.9 - t * 1.1 + wave * 0.4;
  const ptax = 4.95 + t * 0.55 + Math.sin(i / 4) * 0.18;
  const spotAvg = ptax - 0.03 + Math.sin(i / 3) * 0.02;
  const closingAvg = ptax + 0.015 + Math.cos(i / 3) * 0.02;
  const cambialSpread = Math.abs(closingAvg - spotAvg);
  const financialCost = loanAvgRate * 0.55 + accAvgRate * 0.45 + cambialSpread * 3;
  return {
    month,
    loanAvgRate: Number(loanAvgRate.toFixed(2)),
    accAvgRate: Number(accAvgRate.toFixed(2)),
    ptax: Number(ptax.toFixed(4)),
    spotAvg: Number(spotAvg.toFixed(4)),
    closingAvg: Number(closingAvg.toFixed(4)),
    cambialSpread: Number(cambialSpread.toFixed(4)),
    financialCost: Number(financialCost.toFixed(2)),
  };
});

const purposes = ["Capital de giro", "Expansao industrial", "Compra de maquinario", "Reforco de caixa", "Financiamento de exportacao"];
const indexers: Loan["indexer"][] = ["CDI", "SOFR", "Pre-fixado", "SELIC"];
const amortizations: Loan["amortizationSystem"][] = ["Price", "SAC", "Bullet"];

export const loans: Loan[] = Array.from({ length: 18 }).map((_, i) => {
  const bank = banks[i % banks.length];
  const contractedValue = 800_000 + (i * 137_000) % 4_200_000;
  const monthsAgo = 2 + (i * 5) % 22;
  const contractDate = new Date(2026, 6 - monthsAgo, 5 + (i % 20));
  const installments = [12, 24, 36, 48][i % 4];
  const status: LoanStatus = i % 9 === 0 ? "Em atraso" : i % 5 === 0 ? "Liquidado" : "Ativo";
  return {
    id: `EMP-${String(i + 1).padStart(3, "0")}`,
    bankId: bank.id,
    contractNumber: `${bank.id.slice(0, 3).toUpperCase()}-${2023 + (i % 3)}-${1000 + i}`,
    modality: "Emprestimo",
    purpose: purposes[i % purposes.length],
    contractedValue,
    netValue: Math.round(contractedValue * 0.985),
    interestRate: Number((11.5 + ((i * 37) % 500) / 100).toFixed(2)),
    indexer: indexers[i % indexers.length],
    spread: Number((2.2 + (i % 5) * 0.35).toFixed(2)),
    amortizationSystem: amortizations[i % amortizations.length],
    contractDate: contractDate.toISOString().slice(0, 10),
    firstDueDate: new Date(contractDate.getFullYear(), contractDate.getMonth() + 1, 5).toISOString().slice(0, 10),
    lastDueDate: new Date(contractDate.getFullYear(), contractDate.getMonth() + installments, 5).toISOString().slice(0, 10),
    installments,
    periodicity: i % 6 === 0 ? "Trimestral" : "Mensal",
    guarantee: i % 3 === 0 ? "Aval dos socios" : i % 3 === 1 ? "Recebiveis" : "Sem garantia",
    status,
  };
});

const exporters = ["Agroverde Exportadora", "Metaltech do Brasil", "Cafe Sul Trading", "Textil Norte", "MineraCorp"];
const foreignClients = ["Global Foods Inc.", "EuroSteel GmbH", "Nordic Coffee AB", "Atlas Textiles LLC", "Pacific Metals Co."];
const countries = ["Estados Unidos", "Alemanha", "Suecia", "Estados Unidos", "China"];

export const accOperations: AccOperation[] = Array.from({ length: 22 }).map((_, i) => {
  const bank = banks[(i + 2) % banks.length];
  const currency: AccOperation["currency"] = i % 4 === 0 ? "EUR" : "USD";
  const monthsAgo = 1 + (i * 4) % 20;
  const contractDate = new Date(2026, 6 - monthsAgo, 3 + (i % 25));
  const contractedValueForeign = 150_000 + (i * 23_000) % 900_000;
  const ptaxContracting = 5.05 + Math.sin(i / 3) * 0.15 + monthsAgo * 0.01;
  const spotRate = ptaxContracting - 0.02;
  const closingRate = ptaxContracting + 0.02 + (i % 3) * 0.01;
  const ptaxSettlement = ptaxContracting + Math.cos(i / 2) * 0.08;
  const receivedValueBRL = Math.round(contractedValueForeign * spotRate);
  const status: AccStatus = i % 10 === 0 ? "Em atraso" : i % 4 === 0 ? "Liquidado" : "Em aberto";
  return {
    id: `ACC-${String(i + 1).padStart(3, "0")}`,
    bankId: bank.id,
    accNumber: `ACC${2023 + (i % 3)}${String(500 + i)}`,
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
    contractDate: contractDate.toISOString().slice(0, 10),
    closingDate: new Date(contractDate.getFullYear(), contractDate.getMonth() + 2, 10).toISOString().slice(0, 10),
    settlementDate: new Date(contractDate.getFullYear(), contractDate.getMonth() + 2, 15).toISOString().slice(0, 10),
    interestRate: Number((4.2 + (i % 6) * 0.3).toFixed(2)),
    iof: Number((contractedValueForeign * spotRate * 0.0038).toFixed(2)),
    exchangeSpread: Number((closingRate - spotRate).toFixed(4)),
    bankFees: Number((800 + (i % 5) * 150).toFixed(2)),
    status,
  };
});

export function getBank(id: string): Bank {
  return banks.find((b) => b.id === id) ?? banks[0];
}

export const kpis = {
  saldoDevedorTotal: loans
    .filter((l) => l.status !== "Liquidado")
    .reduce((sum, l) => sum + l.contractedValue * 0.62, 0),
  totalContratado: loans.reduce((sum, l) => sum + l.contractedValue, 0),
  totalAmortizado: loans.reduce((sum, l) => sum + l.contractedValue * 0.38, 0),
  jurosPagos: loans.reduce((sum, l) => sum + l.contractedValue * (l.interestRate / 100) * 0.4, 0),
  jurosFuturos: loans.reduce((sum, l) => sum + l.contractedValue * (l.interestRate / 100) * 0.6, 0),
  operacoesAtivas: loans.filter((l) => l.status === "Ativo").length,
  operacoesLiquidadas: loans.filter((l) => l.status === "Liquidado").length,
  operacoesAtraso: loans.filter((l) => l.status === "Em atraso").length,
  totalAccContratado: accOperations.reduce((sum, a) => sum + a.receivedValueBRL, 0),
  exposicaoCambial: accOperations
    .filter((a) => a.status === "Em aberto")
    .reduce((sum, a) => sum + a.contractedValueForeign * a.spotRate, 0),
};

export const cashFlow = months.slice(-12).map((month, i) => {
  const base = 1_200_000 + Math.sin(i / 2) * 300_000;
  return {
    month,
    entradas: Math.round(base * 1.15),
    saidas: Math.round(base * 0.95),
  };
});

const quarters = ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2"];

export const rateHeatmap = banks.map((bank, bi) => ({
  bank: bank.name,
  values: quarters.map((_, qi) => {
    const base = 12.5 + bi * 0.7;
    const wave = Math.sin((bi + qi) / 2.1) * 1.4;
    return Number((base - qi * 0.35 + wave).toFixed(2));
  }),
}));

export const heatmapQuarters = quarters;

export type BankComparisonRow = {
  bankId: string;
  bankName: string;
  qtdAcc: number;
  valorCaptado: number;
  taxaMedia: number;
  spreadMedio: number;
  spotMedio: number;
  fechamentoMedio: number;
  custoMedio: number;
};

export const bankComparison: BankComparisonRow[] = banks.map((bank) => {
  const ops = accOperations.filter((a) => a.bankId === bank.id);
  const qtd = ops.length || 1;
  return {
    bankId: bank.id,
    bankName: bank.name,
    qtdAcc: ops.length,
    valorCaptado: ops.reduce((s, a) => s + a.receivedValueBRL, 0),
    taxaMedia: Number((ops.reduce((s, a) => s + a.interestRate, 0) / qtd).toFixed(2)),
    spreadMedio: Number((ops.reduce((s, a) => s + a.exchangeSpread, 0) / qtd).toFixed(4)),
    spotMedio: Number((ops.reduce((s, a) => s + a.spotRate, 0) / qtd).toFixed(4)),
    fechamentoMedio: Number((ops.reduce((s, a) => s + a.closingRate, 0) / qtd).toFixed(4)),
    custoMedio: Number(
      (ops.reduce((s, a) => s + a.interestRate + a.exchangeSpread * 3, 0) / qtd).toFixed(2)
    ),
  };
});
