"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/field";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { ContaGarantidaRow } from "@/lib/data";
import {
  MESES,
  lastDayOfMonth,
  DeltaBadge,
  computeComparativoCustoMensal,
} from "@/components/conta-garantida/conta-garantida-view";
import { Wallet, PiggyBank, TrendingUp, Percent } from "lucide-react";

// Versao resumida de Conta Garantida (so filtro de Ano/Mes + KPIs), usada em
// Apresentacao - sem banco/status, sem cadastro/edicao e sem os comparativos,
// que sao especificos da tela de Conta Garantida original.
export function ContaGarantidaResumo({ initialContas }: { initialContas: ContaGarantidaRow[] }) {
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const anosDisponiveis = useMemo(
    () => Array.from(new Set(initialContas.flatMap((c) => c.usos.map((u) => u.dataInicio.slice(0, 4))))).sort(),
    [initialContas]
  );

  const fromFilter = yearFilter ? `${yearFilter}-${monthFilter || "01"}-01` : "";
  const toFilter = yearFilter
    ? monthFilter
      ? `${yearFilter}-${monthFilter}-${String(lastDayOfMonth(yearFilter, monthFilter)).padStart(2, "0")}`
      : `${yearFilter}-12-31`
    : "";

  const filteredContas = useMemo(() => {
    return initialContas.map((c) => {
      const usos = c.usos.filter((u) => {
        if (fromFilter && u.dataInicio < fromFilter) return false;
        if (toFilter && u.dataInicio > toFilter) return false;
        return true;
      });
      const jurosPeriodo = Number(usos.reduce((s, u) => s + u.juros, 0).toFixed(2));
      return { ...c, usos, jurosPeriodo };
    });
  }, [initialContas, fromFilter, toFilter]);

  const totais = useMemo(() => {
    return filteredContas.reduce(
      (acc, c) => ({
        limite: acc.limite + c.limiteContratado,
        utilizado: acc.utilizado + c.valorUtilizado,
        disponivel: acc.disponivel + c.valorDisponivel,
      }),
      { limite: 0, utilizado: 0, disponivel: 0 }
    );
  }, [filteredContas]);

  const taxaMediaPonderada = useMemo(() => {
    const pesoTotal = filteredContas.reduce((s, c) => s + c.jurosPeriodo, 0);
    if (pesoTotal <= 0) return 0;
    const soma = filteredContas.reduce((s, c) => s + c.taxaJurosPercent * c.jurosPeriodo, 0);
    return Number((soma / pesoTotal).toFixed(2));
  }, [filteredContas]);

  const comparativoCustoMensal = useMemo(() => computeComparativoCustoMensal(initialContas), [initialContas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Ano</Label>
          <Select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setMonthFilter("");
            }}
            className="w-auto"
          >
            <option value="">Todos os anos</option>
            {anosDisponiveis.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Mês</Label>
          <Select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            disabled={!yearFilter}
            className="w-auto"
          >
            <option value="">Todos os meses</option>
            {MESES.map((label, i) => {
              const value = String(i + 1).padStart(2, "0");
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Limite Contratado Total"
          value={formatCompactCurrency(totais.limite)}
          icon={Wallet}
          tone="teal"
        />
        <KpiCard
          label="Valor Utilizado Total"
          value={formatCompactCurrency(totais.utilizado)}
          icon={TrendingUp}
          tone="soft"
        />
        <KpiCard
          label="Valor Disponível Total"
          value={formatCompactCurrency(totais.disponivel)}
          icon={PiggyBank}
          tone="green"
        />
        <KpiCard
          label="Taxa Média Ponderada"
          value={`${formatPercent(taxaMediaPonderada)} a.m.`}
          icon={Percent}
          tone="soft"
        />
      </div>

      {comparativoCustoMensal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparativo de Custos — Meses de 2025 x 2026</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Mês</th>
                  <th className="px-4 py-2.5 font-medium">Custo Final 2025</th>
                  <th className="px-4 py-2.5 font-medium">Custo Final 2026</th>
                  <th className="px-4 py-2.5 font-medium">Variação</th>
                </tr>
              </thead>
              <tbody>
                {comparativoCustoMensal.map((r) => (
                  <tr key={r.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">{r.label}</td>
                    <td className="px-4 py-2.5">{formatCurrency(r.y2025)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(r.y2026)}</td>
                    <td className="px-4 py-2.5">
                      <DeltaBadge anterior={r.y2025} atual={r.y2026} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
