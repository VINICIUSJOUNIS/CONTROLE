import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { AccRelatorioView } from "@/components/acc/acc-relatorio-view";
import { getAccOperations } from "@/lib/data";
import { buildAccMonthlySchedule } from "@/lib/acc-calc";

export default async function AccRelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accOperations = await getAccOperations();
  const acc = accOperations.find((a) => a.id === id);
  if (!acc) notFound();

  const hoje = new Date().toISOString().slice(0, 10);
  const fimAcumulado = acc.status === "LIQUIDADO" ? acc.dataQuitacao ?? acc.settlementDate : hoje;
  const monthlySchedule = buildAccMonthlySchedule({
    contractDate: acc.contractDate,
    fimAcumulado,
    interestRate: acc.interestRate,
    contractedValueForeign: acc.contractedValueForeign,
    closingRate: acc.closingRate,
    baixas: acc.baixas,
  });

  return (
    <div className="flex flex-col">
      <Topbar title="Relatório do ACC" subtitle={acc.accNumber} />
      <div className="p-6">
        <AccRelatorioView acc={acc} monthlySchedule={monthlySchedule} />
      </div>
    </div>
  );
}
