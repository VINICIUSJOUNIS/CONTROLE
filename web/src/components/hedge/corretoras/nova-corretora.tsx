"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { createCorretora } from "@/app/(dashboard)/hedge/corretoras/actions";
import { Plus } from "lucide-react";

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

export function NovaCorretora({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColors[0]);
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!name.trim()) {
      setError("Informe o nome da corretora/banco.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createCorretora({ name: name.trim(), color });
        setName("");
        setColor(defaultColors[0]);
        setOpen(false);
        router.refresh();
      } catch {
        setError(`Ja existe uma corretora cadastrada com o nome "${name.trim()}".`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button type="button" variant="outline" size="sm" title="Cadastrar nova corretora">
            <Plus size={14} />
          </Button>
        ) : (
          <Button type="button">
            <Plus size={16} />
            Nova corretora
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title="Cadastrar nova corretora/banco">
        <div className="space-y-3">
          <div>
            <Label>Nome da corretora/banco</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: XP, BS2, Bradesco"
            />
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
          <Button className="w-full" onClick={handleCreate} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar corretora"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
