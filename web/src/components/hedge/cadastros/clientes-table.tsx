"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { COUNTRIES } from "@/lib/countries";
import {
  createCliente,
  updateCliente,
  deleteCliente,
  CreateClienteInput,
} from "@/app/(dashboard)/hedge/clientes/actions";
import { Plus, Pencil, Trash2 } from "lucide-react";

export type ClienteRow = { id: string; name: string; city: string | null; country: string; email: string | null; phone: string | null };

function emptyForm(): CreateClienteInput {
  return { name: "", city: "", country: "", email: "", phone: "" };
}

function formFromRow(row: ClienteRow): CreateClienteInput {
  return {
    name: row.name,
    city: row.city ?? "",
    country: row.country,
    email: row.email ?? "",
    phone: row.phone ?? "",
  };
}

export function ClientesTable({ clientes }: { clientes: ClienteRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateClienteInput>(emptyForm());
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(row: ClienteRow) {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setError(null);
    setOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!form.country.trim()) {
      setError("Informe o pais do cliente.");
      return;
    }
    setError(null);
    const payload: CreateClienteInput = {
      name: form.name.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    startTransition(async () => {
      try {
        if (editingId) {
          await updateCliente(editingId, payload);
        } else {
          await createCliente(payload);
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError(`Ja existe um cliente cadastrado com o nome "${payload.name}".`);
      }
    });
  }

  function handleDelete() {
    if (!editingId) return;
    if (
      !window.confirm(
        "Excluir este cliente? So e possivel excluir clientes que nao tenham contratos vinculados."
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCliente(editingId);
        setOpen(false);
        router.refresh();
      } catch {
        setError("Nao foi possivel excluir: este cliente tem contratos vinculados.");
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
              Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent title={editingId ? "Editar cliente" : "Cadastrar novo cliente"}>
            <div className="space-y-3">
              <div>
                <Label>Nome do cliente</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Coffee Trading LLC"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Ex: Nova York"
                  />
                </div>
                <div>
                  <Label>Pais</Label>
                  <Select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                    <option value="">Selecione o pais</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.id} value={c.labelPt}>
                        {c.labelPt}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Ex: contato@cliente.com"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Ex: +1 555 0100"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvando..." : editingId ? "Salvar alteracoes" : "Salvar cliente"}
              </Button>
              {editingId && (
                <Button
                  variant="outline"
                  className="w-full text-danger"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  <Trash2 size={14} />
                  Excluir cliente
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="divide-y divide-border rounded-lg border border-border">
          {clientes.length === 0 && (
            <p className="p-4 text-center text-sm text-muted">Nenhum cliente cadastrado ainda.</p>
          )}
          {clientes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted">
                  {[c.city, c.country].filter(Boolean).join(" - ") || "-"}
                </p>
              </div>
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
