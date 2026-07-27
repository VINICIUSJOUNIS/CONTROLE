"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CreateClienteInput = {
  name: string;
  city: string;
  country: string;
  email: string;
  phone: string;
};

export async function createCliente(input: CreateClienteInput) {
  await prisma.cliente.create({
    data: {
      name: input.name,
      city: input.city || null,
      country: input.country,
      email: input.email || null,
      phone: input.phone || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/contratos");
}
