"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type BankTransferChannelInput = {
  moeda: string;
  correspondentSwift: string;
  correspondentBanco: string;
  correspondentConta: string;
  beneficiarySwift: string;
  beneficiaryBanco: string;
  beneficiaryEndereco: string;
  finalBeneficiario: string;
  finalIban: string;
  finalLocal: string;
  finalBranch: string;
  finalConta: string;
};

export async function saveBankTransferChannel(bankId: string, input: BankTransferChannelInput) {
  await prisma.bankTransferChannel.upsert({
    where: { bankId },
    create: { bankId, ...input },
    update: { ...input },
  });

  revalidatePath("/transferencia-ordem");
}
