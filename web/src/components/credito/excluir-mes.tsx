"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { excluirAnaliseCredito } from "@/app/(dashboard)/credito/actions";

export function ExcluirMes({ id, rotulo }: { id: string; rotulo: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pendente}
      title={`Excluir ${rotulo}`}
      onClick={() => {
        if (confirm(`Excluir a análise de ${rotulo}?`)) iniciar(() => excluirAnaliseCredito(id));
      }}
    >
      <Trash2 size={14} className="text-danger" />
    </Button>
  );
}
