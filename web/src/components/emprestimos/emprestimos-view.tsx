"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";
import { banks, getBank, Loan, LoanStatus, loans as initialLoans } from "@/lib/mock-data";
import { formatCompactCurrency, formatDate, formatPercent } from "@/lib/format";
import { Plus, Search } from "lucide-react";

const statusVariant: Record<LoanStatus, "success" | "danger" | "neutral"> = {
  Ativo: "success",
  Liquidado: "neutral",
  "Em atraso": "danger",
};

function emptyForm() {
  return {
    bankId: banks[0].id,
    purpose: "",
    contractedValue: "",
    interestRate: "",
    indexer: "CDI" as Loan["indexer"],
    installments: "12",
    contractDate: new Date().toISOString().slice(0, 10),
  };
}

export function EmprestimosView() {
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => {
    return loans.filter((l) => {
      if (bankFilter !== "todos" && l.bankId !== bankFilter) return false;
      if (statusFilter !== "todos" && l.status !== statusFilter) return false;
      if (search && !l.contractNumber.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [loans, bankFilter, statusFilter, search]);

  function handleCreate() {
    const contractedValue = Number(form.contractedValue) || 0;
    const contractDate = new Date(form.contractDate);
    const installments = Number(form.installments) || 12;
    const newLoan: Loan = {
      id: `EMP-${String(loans.length + 1).padStart(3, "0")}`,
      bankId: form.bankId,
      contractNumber: `NOVO-${1000 + loans.length}`,
      modality: "Emprestimo",
      purpose: form.purpose || "Capital de giro",
      contractedValue,
      netValue: Math.round(contractedValue * 0.985),
      interestRate: Number(form.interestRate) || 0,
      indexer: form.indexer,
      spread: 2.5,
      amortizationSystem: "Price",
      contractDate: form.contractDate,
      firstDueDate: new Date(contractDate.getFullYear(), contractDate.getMonth() + 1, 5)
        .toISOString()
        .slice(0, 10),
      lastDueDate: new Date(contractDate.getFullYear(), contractDate.getMonth() + installments, 5)
        .toISOString()
        .slice(0, 10),
      installments,
      periodicity: "Mensal",
      guarantee: "A definir",
      status: "Ativo",
    };
    setLoans([newLoan, ...loans]);
    setForm(emptyForm());
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por numero do contrato"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <Select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os bancos</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os status</option>
          <option value="Ativo">Ativo</option>
          <option value="Liquidado">Liquidado</option>
          <option value="Em atraso">Em atraso</option>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} />
              Novo emprestimo
            </Button>
          </DialogTrigger>
          <DialogContent title="Cadastrar novo emprestimo">
            <div className="space-y-3">
              <div>
                <Label>Banco</Label>
                <Select value={form.bankId} onChange={(e) => setForm({ ...form, bankId: e.target.value })}>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Finalidade</Label>
                <Input
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="Ex: Capital de giro"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor contratado (R$)</Label>
                  <Input
                    type="number"
                    value={form.contractedValue}
                    onChange={(e) => setForm({ ...form, contractedValue: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Taxa de juros (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Indexador</Label>
                  <Select
                    value={form.indexer}
                    onChange={(e) => setForm({ ...form, indexer: e.target.value as Loan["indexer"] })}
                  >
                    <option value="CDI">CDI</option>
                    <option value="SOFR">SOFR</option>
                    <option value="Pre-fixado">Pre-fixado</option>
                    <option value="SELIC">SELIC</option>
                  </Select>
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <Input
                    type="number"
                    value={form.installments}
                    onChange={(e) => setForm({ ...form, installments: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Data da contratacao</Label>
                <Input
                  type="date"
                  value={form.contractDate}
                  onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleCreate}>
                Salvar emprestimo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Finalidade</th>
                <th className="px-4 py-3 font-medium">Valor contratado</th>
                <th className="px-4 py-3 font-medium">Taxa</th>
                <th className="px-4 py-3 font-medium">Indexador</th>
                <th className="px-4 py-3 font-medium">Vencimento final</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((loan) => (
                <tr key={loan.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{loan.contractNumber}</td>
                  <td className="px-4 py-2.5">{getBank(loan.bankId).name}</td>
                  <td className="px-4 py-2.5">{loan.purpose}</td>
                  <td className="px-4 py-2.5">{formatCompactCurrency(loan.contractedValue)}</td>
                  <td className="px-4 py-2.5">{formatPercent(loan.interestRate)}</td>
                  <td className="px-4 py-2.5">{loan.indexer}</td>
                  <td className="px-4 py-2.5">{formatDate(loan.lastDueDate)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant[loan.status]}>{loan.status}</Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Nenhum emprestimo encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
