import { Topbar } from "@/components/layout/topbar";
import { ContaGarantidaView } from "@/components/conta-garantida/conta-garantida-view";
import { ContaGarantidaMensal } from "@/components/conta-garantida/conta-garantida-mensal";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { getBanks, getContasGarantidas, getContaGarantidaMensal } from "@/lib/data";

export default async function ContaGarantidaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const [banks, contas, mensal] = await Promise.all([
    getBanks(),
    getContasGarantidas(),
    getContaGarantidaMensal(),
  ]);

  const years = Array.from(new Set(mensal.map((m) => m.month.slice(0, 4)))).sort();
  const mensalFiltrado = mensal.filter((m) => (!from || m.month >= from) && (!to || m.month <= to));

  return (
    <div className="flex flex-col">
      <Topbar title="Conta Garantida" subtitle="Limite contratado e utilização por banco" />
      <div className="space-y-6 p-6">
        <ContaGarantidaView banks={banks} initialContas={contas} />
        <PeriodFilter years={years} />
        <ContaGarantidaMensal data={mensalFiltrado} />
      </div>
    </div>
  );
}
