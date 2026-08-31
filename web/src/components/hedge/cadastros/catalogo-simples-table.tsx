"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Item = { id: string; name: string };

export function CatalogoSimplesTable({
  itemLabel,
  placeholder,
  items,
  createAction,
  updateAction,
  deleteAction,
}: {
  itemLabel: string;
  placeholder: string;
  items: Item[];
  createAction: (name: string) => Promise<void>;
  updateAction: (id: string, name: string) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createAction(newName.trim());
        setNewName("");
        router.refresh();
      } catch {
        setError(`Ja existe "${newName.trim()}" cadastrado.`);
      }
    });
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditingName(item.name);
    setError(null);
  }

  function handleUpdate() {
    if (!editingId || !editingName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateAction(editingId, editingName.trim());
        setEditingId(null);
        router.refresh();
      } catch {
        setError(`Ja existe "${editingName.trim()}" cadastrado.`);
      }
    });
  }

  function handleDelete(id: string) {
    if (
      !window.confirm(
        `Excluir este ${itemLabel.toLowerCase()}? Contratos que ja usam esse valor mantem o registro, mas ele deixa de aparecer nas opcoes.`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAction(id);
        router.refresh();
      } catch {
        setError(`Nao foi possivel excluir: este ${itemLabel.toLowerCase()} esta em uso em algum contrato.`);
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder={placeholder}
          />
          <Button onClick={handleCreate} disabled={isPending}>
            <Plus size={16} />
            Adicionar
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="divide-y divide-border rounded-lg border border-border">
          {items.length === 0 && (
            <p className="p-4 text-center text-sm text-muted">
              Nenhum {itemLabel.toLowerCase()} cadastrado ainda.
            </p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2.5">
              {editingId === item.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                    autoFocus
                    className="h-8"
                  />
                  <button
                    onClick={handleUpdate}
                    disabled={isPending}
                    className="rounded-md p-1.5 text-success hover:bg-border/60"
                    title="Salvar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-md p-1.5 text-muted hover:bg-border/60"
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-sm">{item.name}</p>
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
