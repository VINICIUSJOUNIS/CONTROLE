"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { createDescricaoCafe } from "@/app/(dashboard)/hedge/mesa-operacao/descricoes-cafe/actions";
import { Plus } from "lucide-react";

export function NovaDescricaoCafe({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!name.trim()) {
      setError("Informe a descricao do cafe.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createDescricaoCafe(name.trim());
        setName("");
        setOpen(false);
        router.refresh();
      } catch {
        setError(`Ja existe uma descricao de cafe chamada "${name.trim()}".`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button type="button" variant="outline" size="sm" title="Cadastrar nova descricao de cafe">
            <Plus size={14} />
          </Button>
        ) : (
          <Button type="button">
            <Plus size={16} />
            Nova descricao de cafe
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title="Cadastrar descricao de cafe">
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Arabica tipo 6, bica corrida"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" onClick={handleCreate} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
