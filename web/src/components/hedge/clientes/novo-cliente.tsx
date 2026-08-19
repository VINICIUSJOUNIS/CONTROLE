"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { createCliente } from "@/app/(dashboard)/hedge/clientes/actions";
import { Plus } from "lucide-react";

export function NovoCliente({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setCity("");
    setCountry("");
    setEmail("");
    setPhone("");
  }

  function handleCreate() {
    if (!name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (!country.trim()) {
      setError("Informe o pais do cliente.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createCliente({
          name: name.trim(),
          city: city.trim(),
          country: country.trim(),
          email: email.trim(),
          phone: phone.trim(),
        });
        reset();
        setOpen(false);
        router.refresh();
      } catch {
        setError(`Ja existe um cliente cadastrado com o nome "${name.trim()}".`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button type="button" variant="outline" size="sm" title="Cadastrar novo cliente">
            <Plus size={14} />
          </Button>
        ) : (
          <Button type="button">
            <Plus size={16} />
            Novo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title="Cadastrar novo cliente">
        <div className="space-y-3">
          <div>
            <Label>Nome do cliente</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Coffee Trading LLC"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Nova York"
              />
            </div>
            <div>
              <Label>Pais</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ex: Estados Unidos"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: contato@cliente.com"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +1 555 0100"
              />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" onClick={handleCreate} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar cliente"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
