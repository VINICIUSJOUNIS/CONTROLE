"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBank } from "@/app/(dashboard)/bancos/actions";
import { Trash2 } from "lucide-react";

export function DeleteBankButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Excluir o banco "${name}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteBank(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nao foi possivel excluir o banco.");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        title="Excluir banco"
        className="text-muted hover:text-danger disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
