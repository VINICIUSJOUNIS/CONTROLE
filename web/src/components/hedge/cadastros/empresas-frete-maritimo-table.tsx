"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatCurrency } from "@/lib/format";
import { EmpresaFreteMaritimoData, ItemTabelaFreteMaritimoData } from "@/lib/hedge-data";
import {
  createEmpresaFreteMaritimo,
  updateEmpresaFreteMaritimo,
  deleteEmpresaFreteMaritimo,
  createItemTabelaFreteMaritimo,
  updateItemTabelaFreteMaritimo,
  deleteItemTabelaFreteMaritimo,
} from "@/app/(dashboard)/hedge/mesa-operacao/empresas-frete-maritimo/actions";
import { Plus, Pencil, Trash2, Check, X, ChevronDown } from "lucide-react";

function ItemRow({ item }: { item: ItemTabelaFreteMaritimoData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [descricao, setDescricao] = useState(item.descricao);
  const [preco, setPreco] = useState(String(item.precoPorContainer));

  function handleSave() {
    if (!descricao.trim()) return;
    startTransition(async () => {
      await updateItemTabelaFreteMaritimo(item.id, descricao.trim(), Number(preco.replace(",", ".")) || 0);
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Excluir o item "${item.descricao}"?`)) return;
    startTransition(async () => {
      await deleteItemTabelaFreteMaritimo(item.id);
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

function NovoItemForm({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");

  function handleCreate() {
    if (!descricao.trim()) return;
    startTransition(async () => {
      await createItemTabelaFreteMaritimo(empresaId, descricao.trim(), Number(preco.replace(",", ".")) || 0);
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
        placeholder="Ex: Frete Santos x Roterda (20')"
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

export function EmpresasFreteMaritimoTable({ empresas }: { empresas: EmpresaFreteMaritimoData[] }) {
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
        await createEmpresaFreteMaritimo(newName.trim());
        setNewName("");
        router.refresh();
      } catch {
        setError(`Já existe "${newName.trim()}" cadastrada.`);
      }
    });
  }

  function startEdit(e: EmpresaFreteMaritimoData) {
    setEditingId(e.id);
    setEditingName(e.name);
    setError(null);
  }

  function handleUpdate() {
    if (!editingId || !editingName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateEmpresaFreteMaritimo(editingId, editingName.trim());
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
        "Excluir esta empresa de frete marítimo? Contratos que já usam essa empresa mantêm o registro, mas ela deixa de aparecer nas opções."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteEmpresaFreteMaritimo(id);
        router.refresh();
      } catch {
        setError("Não foi possível excluir: esta empresa está em uso em algum contrato.");
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
            placeholder="Ex: Maersk Line, CMA CGM"
          />
          <Button onClick={handleCreate} disabled={isPending}>
            <Plus size={16} />
            Adicionar
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="divide-y divide-border rounded-lg border border-border">
          {empresas.length === 0 && (
            <p className="p-4 text-center text-sm text-muted">Nenhuma empresa de frete marítimo cadastrada ainda.</p>
          )}
          {empresas.map((e) => {
            const isExpanded = expandedId === e.id;
            return (
              <div key={e.id}>
                <div className="flex items-center gap-2 p-2.5">
                  {editingId === e.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(ev) => setEditingName(ev.target.value)}
                        onKeyDown={(ev) => ev.key === "Enter" && handleUpdate()}
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
                        onClick={() => setExpandedId(isExpanded ? null : e.id)}
                        className="flex flex-1 items-center gap-1.5 text-left text-sm"
                      >
                        <ChevronDown
                          size={14}
                          className={`shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                        {e.name}
                        <span className="text-xs text-muted">({e.itens.length} itens)</span>
                      </button>
                      <button onClick={() => startEdit(e)} className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground" title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
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
                    {e.itens.map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                    <NovoItemForm empresaId={e.id} />
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
