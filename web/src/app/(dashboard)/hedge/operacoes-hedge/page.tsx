import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { HedgeView } from "@/components/hedge/hedge-view";
import { getCorretoras, getHedgeKpis, getHedgeOperations } from "@/lib/hedge-data";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, TrendingDown, FileCheck2, ListChecks } from "lucide-react";

export default async function HedgePage() {
  const [corretoras, operations, kpis] = await Promise.all([
    getCorretoras(),
    getHedgeOperations(),
    getHedgeKpis(),
  ]);

  const cards = [
    {
      label: "Posicao liquida (US$)",
      value: `US$ ${kpis.posicaoLiquidaUsd.toLocaleString("pt-BR")}`,
      icon: kpis.posicaoLiquidaUsd >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "Notional em aberto (US$)",
      value: `US$ ${kpis.notionalAberto.toLocaleString("pt-BR")}`,
      icon: ListChecks,
    },
    {
      label: "Resultado realizado",
      value: formatCurrency(kpis.resultadoRealizado),
      icon: kpis.resultadoRealizado >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "Contratos a liquidar",
      value: `${kpis.contratosAbertos} de ${kpis.totalContratos}`,
      icon: FileCheck2,
    },
  ];

  return (
    <div className="flex flex-col">
      <Topbar title="Operacoes de Hedge" subtitle="Contratos de NDF/Trava cambial" />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted">
                <c.icon size={14} className="text-primary" />
                {c.label}
              </div>
              <p className="mt-2 text-lg font-semibold">{c.value}</p>
            </Card>
          ))}
        </div>

        <HedgeView corretoras={corretoras} operations={operations} />
      </div>
    </div>
  );
}
