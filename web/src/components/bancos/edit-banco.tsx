"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { updateBank } from "@/app/(dashboard)/bancos/actions";
import { Pencil } from "lucide-react";

const defaultColors = [
  "#1c8388",
  "#12b76a",
  "#f79009",
  "#f04438",
  "#7a5af8",
  "#0891b2",
  "#db2777",
  "#000000",
];

export function EditBanco({ id, name: currentName, color: currentColor }: { id: string; name: string; color: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [color, setColor] = useState(currentColor);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(currentName);
      setColor(currentColor);
      setError(null);
    }
    setOpen(next);
  }

  function handleSave() {
    if (!name.trim()) {
      setError("Informe o nome do banco.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await updateBank(id, { name: name.trim(), color });
        setOpen(false);
        router.refresh();
      } catch {
        setError(`Ja existe um banco cadastrado com o nome "${name.trim()}".`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button type="button" title="Editar banco" className="text-muted hover:text-foreground">
          <Pencil size={14} />
        </button>
      </DialogTrigger>
      <DialogContent title="Editar banco">
        <div className="space-y-3">
          <div>
            <Label>Nome do banco</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Banco Votorantim" />
          </div>
          <div>
            <Label>Cor de identificacao</Label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full border-2"
                  style={{
                    background: c,
                    borderColor: color === c ? "var(--foreground)" : "transparent",
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar alteracoes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
