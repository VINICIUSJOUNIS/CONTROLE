"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatCurrency } from "@/lib/format";
import { TransportadoraRodoviariaData, ItemTabelaTransportadoraData } from "@/lib/hedge-data";
import {
  createTransportadoraRodoviaria,
  updateTransportadoraRodoviaria,
  deleteTransportadoraRodoviaria,
  createItemTabelaTransportadora,
  updateItemTabelaTransportadora,
  deleteItemTabelaTransportadora,
} from "@/app/(dashboard)/hedge/mesa-operacao/transportadoras-rodoviarias/actions";
import { Plus, Pencil, Trash2, Check, X, ChevronDown } from "lucide-react";

function ItemRow({ item }: { item: ItemTabelaTransportadoraData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [descricao, setDescricao] = useState(item.descricao);
  const [preco, setPreco] = useState(String(item.precoPorContainer));

  function handleSave() {
    if (!descricao.trim()) return;
    startTransition(async () => {
      await updateItemTabelaTransportadora(item.id, descricao.trim(), Number(preco.replace(",", ".")) || 0);
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Excluir o item "${item.descricao}"?`)) return;
    startTransition(async () => {
      await deleteItemTabelaTransportadora(item.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="h-8 flex-1" />
        <input
          type="number"
          step="0.01"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          className="h-8 w-28 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        />
        <button onClick={handleSave} disabled={isPending} className="rounded-md p-1.5 text-success hover:bg-border/60" title="Salvar">
          <Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="rounded-md p-1.5 text-muted hover:bg-border/60" title="Cancelar">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="min-w-0 flex-1 truncate">{item.descricao}</span>
      <span className="shrink-0 text-muted">{formatCurrency(item.precoPorContainer)}</span>
      <button onClick={() => setEditing(true)} className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground" title="Editar">
        <Pencil size={13} />
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
        title="Excluir"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function NovoItemForm({ transportadoraId }: { transportadoraId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");

  function handleCreate() {
    if (!descricao.trim()) return;
    startTransition(async () => {
      await createItemTabelaTransportadora(transportadoraId, descricao.trim(), Number(preco.replace(",", ".")) || 0);
      setDescricao("");
      setPreco("");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder="Ex: Coleta RJ x Estufagem Manhumirim-MG x Entrega Porto RJ (20')"
        className="h-8 flex-1"
      />
      <input
        type="number"
        step="0.01"
        value={preco}
        onChange={(e) => setPreco(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder="Preço"
        className="h-8 w-28 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
      />
      <button
        onClick={handleCreate}
        disabled={isPending}
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        <Plus size={14} />
        Adicionar
      </button>
    </div>
  );
}

export function TransportadorasRodoviariasTable({
  transportadoras,
}: {
  transportadoras: TransportadoraRodoviariaData[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createTransportadoraRodoviaria(newName.trim());
        setNewName("");
        router.refresh();
      } catch {
        setError(`Já existe "${newName.trim()}" cadastrada.`);
      }
    });
  }

  function startEdit(t: TransportadoraRodoviariaData) {
    setEditingId(t.id);
    setEditingName(t.name);
    setError(null);
  }

  function handleUpdate() {
    if (!editingId || !editingName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateTransportadoraRodoviaria(editingId, editingName.trim());
        setEditingId(null);
        router.refresh();
      } catch {
        setError(`Já existe "${editingName.trim()}" cadastrada.`);
      }
    });
  }

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Excluir esta transportadora rodoviária? Contratos que já usam essa transportadora mantêm o registro, mas ela deixa de aparecer nas opções."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTransportadoraRodoviaria(id);
        router.refresh();
      } catch {
        setError("Não foi possível excluir: esta transportadora está em uso em algum contrato.");
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
            placeholder="Ex: Transportes Rio Doce"
          />
          <Button onClick={handleCreate} disabled={isPending}>
            <Plus size={16} />
            Adicionar
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="divide-y divide-border rounded-lg border border-border">
          {transportadoras.length === 0 && (
            <p className="p-4 text-center text-sm text-muted">Nenhuma transportadora cadastrada ainda.</p>
          )}
          {transportadoras.map((t) => {
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id}>
                <div className="flex items-center gap-2 p-2.5">
                  {editingId === t.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                        autoFocus
                        className="h-8"
                      />
                      <button onClick={handleUpdate} disabled={isPending} className="rounded-md p-1.5 text-success hover:bg-border/60" title="Salvar">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-md p-1.5 text-muted hover:bg-border/60" title="Cancelar">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className="flex flex-1 items-center gap-1.5 text-left text-sm"
                      >
                        <ChevronDown
                          size={14}
                          className={`shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                        {t.name}
                        <span className="text-xs text-muted">({t.itens.length} itens)</span>
                      </button>
                      <button onClick={() => startEdit(t)} className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={isPending}
                        className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
                {isExpanded && (
                  <div className="space-y-2 border-t border-border bg-border/5 p-3">
                    {t.itens.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                    <NovoItemForm transportadoraId={t.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
