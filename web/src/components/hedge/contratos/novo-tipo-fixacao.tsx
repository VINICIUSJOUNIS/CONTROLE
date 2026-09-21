"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { createTipoFixacao } from "@/app/(dashboard)/hedge/mesa-operacao/tipos-fixacao/actions";
import { Plus } from "lucide-react";

export function NovoTipoFixacao({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!name.trim()) {
      setError("Informe o nome do tipo de fixação.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createTipoFixacao(name.trim());
        setName("");
        setOpen(false);
        router.refresh();
      } catch {
        setError(`Já existe um tipo de fixação chamado "${name.trim()}".`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button type="button" variant="outline" size="sm" title="Cadastrar novo tipo de fixação">
            <Plus size={14} />
          </Button>
        ) : (
          <Button type="button">
            <Plus size={16} />
            Novo tipo de fixação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title="Cadastrar tipo de fixação">
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Buyer, Seller"
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
