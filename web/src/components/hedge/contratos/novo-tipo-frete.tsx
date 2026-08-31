"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { createTipoFrete } from "@/app/(dashboard)/hedge/mesa-operacao/tipos-frete/actions";
import { Plus } from "lucide-react";

export function NovoTipoFrete({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!name.trim()) {
      setError("Informe o nome do tipo de frete.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createTipoFrete(name.trim());
        setName("");
        setOpen(false);
        router.refresh();
      } catch {
        setError(`Ja existe um tipo de frete chamado "${name.trim()}".`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button type="button" variant="outline" size="sm" title="Cadastrar novo tipo de frete">
            <Plus size={14} />
          </Button>
        ) : (
          <Button type="button">
            <Plus size={16} />
            Novo tipo de frete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title="Cadastrar tipo de frete">
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: FOB, CIF, CFR"
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
