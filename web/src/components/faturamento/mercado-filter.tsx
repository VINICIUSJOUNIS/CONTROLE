"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label, Select } from "@/components/ui/field";

export function MercadoFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visao = searchParams.get("visao") === "junto" ? "junto" : "separado";

  function apply(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "separado") params.delete("visao");
    else params.set("visao", next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div>
      <Label>Mercado</Label>
      <Select value={visao} onChange={(e) => apply(e.target.value)} className="w-auto">
        <option value="separado">Interno e Externo separados</option>
        <option value="junto">Interno e Externo juntos</option>
      </Select>
    </div>
  );
}
