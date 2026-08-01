"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteStatementAction } from "@/app/(dashboard)/balancetes/actions";

export function DeleteStatementButton({ id, periodLabel }: { id: string; periodLabel: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Excluir o balancete "${periodLabel}"? Essa ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      await deleteStatementAction(id);
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} disabled={isPending} aria-label="Excluir">
      <Trash2 size={15} className="text-danger" />
    </Button>
  );
}
