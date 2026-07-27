import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    return await prisma.profile.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email ?? "",
        role: "CONSULTA",
      },
    });
  } catch {
    // Concurrent requests can race to create the same profile; the row exists either way.
    return await prisma.profile.findUniqueOrThrow({ where: { id: user.id } });
  }
}
