"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FornecedorMarcacaoSacaria } from "@/lib/hedge-data";
import { faixaCoresOrder, faixaCoresLabels, FaixaCoresMarcacaoValue } from "@/lib/contrato-shared";
import {
  createFornecedorMarcacaoSacaria,
  updateFornecedorMarcacaoSacaria,
  deleteFornecedorMarcacaoSacaria,
  setPrecoMarcacaoSacaria,
} from "@/app/(dashboard)/hedge/mesa-operacao/fornecedores-marcacao-sacaria/actions";
import { Plus, Pencil, Trash2, Check, X, ChevronDown } from "lucide-react";

function PrecoInput({ fornecedorId, faixa, preco }: { fornecedorId: string; faixa: FaixaCoresMarcacaoValue; preco: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(preco));
  const [isPending, startTransition] = useTransition();

  function handleBlur() {
    const num = Number(value.replace(",", "."));
    if (!Number.isFinite(num) || num === preco) {
      setValue(String(preco));
      return;
    }
    startTransition(async () => {
      await setPrecoMarcacaoSacaria(fornecedorId, faixa, num);
      router.refresh();
    });
  }

  return (
    <label className="text-xs text-muted">
      {faixaCoresLabels[faixa]}
      <input
        type="number"
        step="0.0001"
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className="mt-1 block w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
      />
    </label>
  );
}

export function FornecedoresMarcacaoSacariaTable({
  fornecedores,
}: {
  fornecedores: FornecedorMarcacaoSacaria[];
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
        await createFornecedorMarcacaoSacaria(newName.trim());
        setNewName("");
        router.refresh();
      } catch {
        setError(`Já existe "${newName.trim()}" cadastrado.`);
      }
    });
  }

  function startEdit(f: FornecedorMarcacaoSacaria) {
    setEditingId(f.id);
    setEditingName(f.name);
    setError(null);
  }

  function handleUpdate() {
    if (!editingId || !editingName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateFornecedorMarcacaoSacaria(editingId, editingName.trim());
        setEditingId(null);
        router.refresh();
      } catch {
        setError(`Já existe "${editingName.trim()}" cadastrado.`);
      }
    });
  }

  function handleDelete(id: string) {
    if (
      !window.confirm(
        "Excluir este fornecedor de marcação de sacaria? Contratos que já usam esse fornecedor mantêm o registro, mas ele deixa de aparecer nas opções."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteFornecedorMarcacaoSacaria(id);
        router.refresh();
      } catch {
        setError("Não foi possível excluir: este fornecedor está em uso em algum contrato.");
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
            placeholder="Ex: Sacaria Brasil"
          />
          <Button onClick={handleCreate} disabled={isPending}>
            <Plus size={16} />
            Adicionar
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="divide-y divide-border rounded-lg border border-border">
          {fornecedores.length === 0 && (
            <p className="p-4 text-center text-sm text-muted">Nenhum fornecedor cadastrado ainda.</p>
          )}
          {fornecedores.map((f) => {
            const isExpanded = expandedId === f.id;
            return (
              <div key={f.id}>
                <div className="flex items-center gap-2 p-2.5">
                  {editingId === f.id ? (
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
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : f.id)}
                        className="flex flex-1 items-center gap-1.5 text-left text-sm"
                      >
                        <ChevronDown
                          size={14}
                          className={`shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                        {f.name}
                      </button>
                      <button
                        onClick={() => startEdit(f)}
                        className="rounded-md p-1.5 text-muted hover:bg-border/60 hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(f.id)}
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
                  <div className="grid grid-cols-2 gap-3 border-t border-border bg-border/5 p-3 sm:grid-cols-3 lg:grid-cols-6">
                    {faixaCoresOrder.map((faixa) => (
                      <PrecoInput key={faixa} fornecedorId={f.id} faixa={faixa} preco={f.precos[faixa]} />
                    ))}
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
