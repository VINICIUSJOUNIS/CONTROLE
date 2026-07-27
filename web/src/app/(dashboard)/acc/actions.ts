"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type AccFormInput = {
  bankId: string;
  contractNumber: string;
  contractedValueForeign: number;
  spotRate: number;
  closingRate: number;
  interestRateAnnual: number;
  contractDate: string;
  vencimento: string;
  dataQuitacao: string;
  exchangeVariationValue: number;
  status: "EM_ABERTO" | "LIQUIDADO" | "EM_ATRASO";
  hasInsurance: boolean;
  insuranceCost: number;
  otherCosts: number;
  iof: number;
  bankFees: number;
};

function revalidateAll() {
  revalidatePath("/acc");
  revalidatePath("/");
  revalidatePath("/cambial");
  revalidatePath("/taxas");
  revalidatePath("/bancos");
  revalidatePath("/relatorios");
}

export async function createAcc(input: AccFormInput) {
  const contractDate = parseLocalDate(input.contractDate);
  const settlementDate = parseLocalDate(input.vencimento);
  const closingDate = input.dataQuitacao ? parseLocalDate(input.dataQuitacao) : null;
  const receivedValueBRL = Math.round(input.contractedValueForeign * input.closingRate);

  await prisma.accOperation.create({
    data: {
      bankId: input.bankId,
      accNumber: input.contractNumber,
      exchangeContractNumber: `CC-${input.contractNumber}`,
      exporter: "Nao informado",
      foreignClient: "Nao informado",
      invoice: `INV-${input.contractNumber}`,
      country: "Nao informado",
      currency: "USD",
      invoiceValue: input.contractedValueForeign,
      contractedValueForeign: input.contractedValueForeign,
      receivedValueBRL,
      spotRate: input.spotRate,
      closingRate: input.closingRate,
      ptaxContracting: input.spotRate,
      ptaxSettlement: input.spotRate,
      contractDate,
      closingDate,
      settlementDate,
      interestRate: input.interestRateAnnual,
      iof: input.iof,
      exchangeSpread: Number((input.closingRate - input.spotRate).toFixed(4)),
      exchangeVariationValue: input.exchangeVariationValue,
      bankFees: input.bankFees,
      hasInsurance: input.hasInsurance,
      insuranceCost: input.hasInsurance ? input.insuranceCost : 0,
      otherCosts: input.otherCosts,
      status: input.status,
    },
  });

  revalidateAll();
}

export async function updateAcc(id: string, input: AccFormInput) {
  const contractDate = parseLocalDate(input.contractDate);
  const settlementDate = parseLocalDate(input.vencimento);
  const closingDate = input.dataQuitacao ? parseLocalDate(input.dataQuitacao) : null;
  const receivedValueBRL = Math.round(input.contractedValueForeign * input.closingRate);

  await prisma.accOperation.update({
    where: { id },
    data: {
      bankId: input.bankId,
      accNumber: input.contractNumber,
      contractedValueForeign: input.contractedValueForeign,
      receivedValueBRL,
      spotRate: input.spotRate,
      closingRate: input.closingRate,
      contractDate,
      closingDate,
      settlementDate,
      interestRate: input.interestRateAnnual,
      exchangeSpread: Number((input.closingRate - input.spotRate).toFixed(4)),
      exchangeVariationValue: input.exchangeVariationValue,
      iof: input.iof,
      bankFees: input.bankFees,
      hasInsurance: input.hasInsurance,
      insuranceCost: input.hasInsurance ? input.insuranceCost : 0,
      otherCosts: input.otherCosts,
      status: input.status,
    },
  });

  revalidateAll();
}

export async function deleteAcc(id: string) {
  await prisma.accOperation.delete({ where: { id } });
  revalidateAll();
}
