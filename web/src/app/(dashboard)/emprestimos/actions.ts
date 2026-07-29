"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseLocalDate } from "@/lib/date";

export type LoanFormInput = {
  bankId: string;
  contractNumber: string;
  purpose: string;
  contractedValue: number;
  interestRate: number;
  indexer: "CDI" | "SOFR" | "PRE_FIXADO" | "SELIC";
  installments: number;
  contractDate: string;
  vencimento: string;
  status: "ATIVO" | "LIQUIDADO" | "EM_ATRASO";
  amortizationSystem: "PRICE" | "SAC" | "BULLET";
  iof: number;
  hasInsurance: boolean;
  insuranceCost: number;
  otherCosts: number;
};

function revalidateAll() {
  revalidatePath("/emprestimos");
  revalidatePath("/");
  revalidatePath("/taxas");
  revalidatePath("/bancos");
  revalidatePath("/relatorios");
}

export async function createLoan(input: LoanFormInput) {
  const contractDate = parseLocalDate(input.contractDate);
  const lastDueDate = parseLocalDate(input.vencimento);

  await prisma.loan.create({
    data: {
      bankId: input.bankId,
      contractNumber: input.contractNumber,
      purpose: input.purpose || "Capital de giro",
      contractedValue: input.contractedValue,
      netValue: Math.round(input.contractedValue * 0.985),
      interestRate: input.interestRate,
      indexer: input.indexer,
      spread: 2.5,
      amortizationSystem: input.amortizationSystem,
      contractDate,
      firstDueDate: new Date(contractDate.getFullYear(), contractDate.getMonth() + 1, 5),
      lastDueDate,
      installments: input.installments,
      periodicity: "Mensal",
      guarantee: "A definir",
      iof: input.iof,
      hasInsurance: input.hasInsurance,
      insuranceCost: input.hasInsurance ? input.insuranceCost : 0,
      otherCosts: input.otherCosts,
      status: input.status,
    },
  });

  revalidateAll();
}

export async function updateLoan(id: string, input: LoanFormInput) {
  const contractDate = parseLocalDate(input.contractDate);
  const lastDueDate = parseLocalDate(input.vencimento);

  await prisma.loan.update({
    where: { id },
    data: {
      bankId: input.bankId,
      contractNumber: input.contractNumber,
      purpose: input.purpose || "Capital de giro",
      contractedValue: input.contractedValue,
      interestRate: input.interestRate,
      indexer: input.indexer,
      amortizationSystem: input.amortizationSystem,
      contractDate,
      lastDueDate,
      installments: input.installments,
      iof: input.iof,
      hasInsurance: input.hasInsurance,
      insuranceCost: input.hasInsurance ? input.insuranceCost : 0,
      otherCosts: input.otherCosts,
      status: input.status,
    },
  });

  revalidateAll();
}

export async function deleteLoan(id: string) {
  await prisma.loan.delete({ where: { id } });
  revalidateAll();
}

export async function setLoanPayment(
  loanId: string,
  numero: number,
  input: { paidAt: string; paidValue: number }
) {
  await prisma.loanInstallment.upsert({
    where: { loanId_numero: { loanId, numero } },
    create: {
      loanId,
      numero,
      paidAt: parseLocalDate(input.paidAt),
      paidValue: input.paidValue,
    },
    update: {
      paidAt: parseLocalDate(input.paidAt),
      paidValue: input.paidValue,
    },
  });

  revalidateAll();
}

export async function deleteLoanPayment(loanId: string, numero: number) {
  const existing = await prisma.loanInstallment.findUnique({ where: { loanId_numero: { loanId, numero } } });
  if (!existing) return;

  if (existing.vencimento) {
    await prisma.loanInstallment.update({
      where: { loanId_numero: { loanId, numero } },
      data: { paidAt: null, paidValue: null },
    });
  } else {
    await prisma.loanInstallment.delete({ where: { loanId_numero: { loanId, numero } } });
  }

  revalidateAll();
}

export async function setLoanInstallmentDueDate(loanId: string, numero: number, vencimento: string) {
  await prisma.loanInstallment.upsert({
    where: { loanId_numero: { loanId, numero } },
    create: { loanId, numero, vencimento: parseLocalDate(vencimento) },
    update: { vencimento: parseLocalDate(vencimento) },
  });

  revalidateAll();
}

export async function clearLoanInstallmentDueDate(loanId: string, numero: number) {
  const existing = await prisma.loanInstallment.findUnique({ where: { loanId_numero: { loanId, numero } } });
  if (!existing) return;

  if (existing.paidAt) {
    await prisma.loanInstallment.update({
      where: { loanId_numero: { loanId, numero } },
      data: { vencimento: null },
    });
  } else {
    await prisma.loanInstallment.delete({ where: { loanId_numero: { loanId, numero } } });
  }

  revalidateAll();
}
