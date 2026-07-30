"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label, Select } from "@/components/ui/field";

export function ModalidadeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const modalidade = searchParams.get("modalidade") ?? "TODOS";

  function apply(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "TODOS") params.delete("modalidade");
    else params.set("modalidade", next);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div>
      <Label>Modalidade</Label>
      <Select value={modalidade} onChange={(e) => apply(e.target.value)} className="w-auto">
        <option value="TODOS">Emprestimos + ACC</option>
        <option value="EMPRESTIMOS">So Emprestimos</option>
        <option value="ACC">So ACC</option>
      </Select>
    </div>
  );
}
