"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CreateCorretoraInput = {
  name: string;
  color: string;
};

function revalidateAll() {
  revalidatePath("/hedge");
  revalidatePath("/hedge/contratos");
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

export async function createCorretora(input: CreateCorretoraInput) {
  await prisma.corretora.create({
    data: {
      name: input.name,
      color: input.color,
    },
  });

  revalidateAll();
}

export async function updateCorretora(id: string, input: CreateCorretoraInput) {
  await prisma.corretora.update({
    where: { id },
    data: {
      name: input.name,
      color: input.color,
    },
  });

  revalidateAll();
}

export async function deleteCorretora(id: string) {
  await prisma.corretora.delete({ where: { id } });
  revalidateAll();
}
