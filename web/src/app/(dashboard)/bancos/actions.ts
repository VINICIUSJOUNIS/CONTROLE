"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CreateBankInput = {
  name: string;
  color: string;
};

export async function createBank(input: CreateBankInput) {
  await prisma.bank.create({
    data: {
      name: input.name,
      color: input.color,
    },
  });

  revalidatePath("/bancos");
  revalidatePath("/emprestimos");
  revalidatePath("/acc");
  revalidatePath("/");
}

export async function updateBank(id: string, input: CreateBankInput) {
  await prisma.bank.update({
    where: { id },
    data: {
      name: input.name,
      color: input.color,
    },
  });

  revalidatePath("/bancos");
  revalidatePath("/emprestimos");
  revalidatePath("/acc");
  revalidatePath("/");
}

export async function deleteBank(id: string) {
  const [loanCount, accCount] = await Promise.all([
    prisma.loan.count({ where: { bankId: id } }),
    prisma.accOperation.count({ where: { bankId: id } }),
  ]);

  if (loanCount > 0 || accCount > 0) {
    throw new Error("Nao e possivel excluir um banco com emprestimos ou ACC vinculados.");
  }

  await prisma.bank.delete({ where: { id } });

  revalidatePath("/bancos");
  revalidatePath("/emprestimos");
  revalidatePath("/acc");
  revalidatePath("/");
}
