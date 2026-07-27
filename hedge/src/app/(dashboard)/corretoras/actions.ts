"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CreateCorretoraInput = {
  name: string;
  color: string;
};

export async function createCorretora(input: CreateCorretoraInput) {
  await prisma.corretora.create({
    data: {
      name: input.name,
      color: input.color,
    },
  });

  revalidatePath("/");
}
