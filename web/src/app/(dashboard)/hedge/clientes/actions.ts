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

function revalidateAll() {
  revalidatePath("/hedge");
  revalidatePath("/hedge/contratos");
  revalidatePath("/hedge/mesa-operacao/[slug]", "page");
  revalidatePath("/hedge/cadastros");
}

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

  revalidateAll();
}

export async function updateCliente(id: string, input: CreateClienteInput) {
  await prisma.cliente.update({
    where: { id },
    data: {
      name: input.name,
      city: input.city || null,
      country: input.country,
      email: input.email || null,
      phone: input.phone || null,
    },
  });

  revalidateAll();
}

export async function deleteCliente(id: string) {
  await prisma.cliente.delete({ where: { id } });
  revalidateAll();
}
