"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import {
  createCorretora,
  updateCorretora,
  deleteCorretora,
  CreateCorretoraInput,
} from "@/app/(dashboard)/hedge/corretoras/actions";
import { Plus, Pencil, Trash2 } from "lucide-react";

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

export type CorretoraRow = { id: string; name: string; color: string };

export function CorretorasTable({ corretoras }: { corretoras: CorretoraRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCorretoraInput>({ name: "", color: defaultColors[0] });
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", color: defaultColors[0] });
    setError(null);
    setOpen(true);
  }

  function openEdit(row: CorretoraRow) {
    setEditingId(row.id);
    setForm({ name: row.name, color: row.color });
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      setError("Informe o nome da corretora/banco.");
      return;
    }
    setError(null);
    const payload = { name: form.name.trim(), color: form.color };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateCorretora(editingId, payload);
        } else {
          await createCorretora(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError(`Ja existe uma corretora cadastrada com o nome "${payload.name}".`);
      }
    });
  }

  function handleDelete() {
    if (!editingId) return;
    if (
      !window.confirm(
        "Excluir esta corretora/banco? So e possivel excluir corretoras que nao tenham contratos ou operacoes vinculadas."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCorretora(editingId);
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel excluir: esta corretora tem contratos ou operacoes vinculadas.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Nova corretora
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar corretora/banco" : "Cadastrar nova corretora/banco"}>
            <div className="space-y-3">
              <div>
                <Label>Nome da corretora/banco</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                      onClick={() => setForm({ ...form, color: c })}
                      className="h-8 w-8 rounded-full border-2"
                      style={{
                        background: c,
                        borderColor: form.color === c ? "var(--foreground)" : "transparent",
                      }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Salvar alteracoes" : "Salvar corretora"}
              </Button>
              {editingId && (
                <Button
                  variant="outline"
                  className="w-full text-danger"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  <Trash2 size={14} />
                  Excluir corretora
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="divide-y divide-border rounded-lg border border-border">
          {corretoras.length === 0 && (
            <p className="p-4 text-center text-sm text-muted">Nenhuma corretora cadastrada ainda.</p>
          )}
          {corretoras.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
              <p className="flex-1 truncate text-sm font-medium">{c.name}</p>
              <button
                onClick={() => openEdit(c)}
                className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
