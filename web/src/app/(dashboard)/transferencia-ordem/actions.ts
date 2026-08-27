"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type BankTransferChannelInput = {
  moeda: string;
  instrucoes: string;
};

export async function saveBankTransferChannel(bankId: string, input: BankTransferChannelInput) {
  await prisma.bankTransferChannel.upsert({
    where: { bankId },
    create: { bankId, ...input },
    update: { ...input },
  });

  revalidatePath("/transferencia-ordem");
}
