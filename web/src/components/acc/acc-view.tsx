"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { AccStatus, accOperations, banks, getBank } from "@/lib/mock-data";
import { formatCompactCurrency, formatDate } from "@/lib/format";

const statusVariant: Record<AccStatus, "success" | "danger" | "warning"> = {
  "Em aberto": "warning",
  Liquidado: "success",
  "Em atraso": "danger",
};

export function AccView() {
  const [bankFilter, setBankFilter] = useState("todos");
  const [currencyFilter, setCurrencyFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filtered = useMemo(() => {
    return accOperations.filter((a) => {
      if (bankFilter !== "todos" && a.bankId !== bankFilter) return false;
      if (currencyFilter !== "todas" && a.currency !== currencyFilter) return false;
      if (statusFilter !== "todos" && a.status !== statusFilter) return false;
      return true;
    });
  }, [bankFilter, currencyFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os bancos</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)} className="w-auto">
          <option value="todas">Todas as moedas</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="todos">Todos os status</option>
          <option value="Em aberto">Em aberto</option>
          <option value="Liquidado">Liquidado</option>
          <option value="Em atraso">Em atraso</option>
        </Select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">ACC</th>
                <th className="px-4 py-3 font-medium">Banco</th>
                <th className="px-4 py-3 font-medium">Exportador</th>
                <th className="px-4 py-3 font-medium">Moeda</th>
                <th className="px-4 py-3 font-medium">Valor contratado</th>
                <th className="px-4 py-3 font-medium">Recebido (R$)</th>
                <th className="px-4 py-3 font-medium">Spot</th>
                <th className="px-4 py-3 font-medium">Fechamento</th>
                <th className="px-4 py-3 font-medium">Liquidacao</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => (
                <tr key={acc.id} className="border-b border-border last:border-0 hover:bg-border/20">
                  <td className="px-4 py-2.5 font-medium">{acc.accNumber}</td>
                  <td className="px-4 py-2.5">{getBank(acc.bankId).name}</td>
                  <td className="px-4 py-2.5">{acc.exporter}</td>
                  <td className="px-4 py-2.5">{acc.currency}</td>
                  <td className="px-4 py-2.5">
                    {acc.currency} {acc.contractedValueForeign.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5">{formatCompactCurrency(acc.receivedValueBRL)}</td>
                  <td className="px-4 py-2.5">R$ {acc.spotRate.toFixed(4)}</td>
                  <td className="px-4 py-2.5">R$ {acc.closingRate.toFixed(4)}</td>
                  <td className="px-4 py-2.5">{formatDate(acc.settlementDate)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant[acc.status]}>{acc.status}</Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted">
                    Nenhuma operacao de ACC encontrada com os filtros atuais.
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
