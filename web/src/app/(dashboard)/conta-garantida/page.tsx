import { Topbar } from "@/components/layout/topbar";
import { ContaGarantidaView } from "@/components/conta-garantida/conta-garantida-view";
import { getBanks, getContasGarantidas, getContaGarantidaEvolucao } from "@/lib/data";
import { formatMonthLabel } from "@/lib/format";

export default async function ContaGarantidaPage() {
  const [banks, contas, evolucao] = await Promise.all([
    getBanks(),
    getContasGarantidas(),
    getContaGarantidaEvolucao(),
  ]);

  const evolucaoData = evolucao.data.map((row) => ({
    ...row,
    month: formatMonthLabel(String(row.month)),
  }));

  return (
    <div className="flex flex-col">
      <Topbar title="Conta Garantida" subtitle="Limite contratado e utilização por banco" />
      <div className="space-y-6 p-6">
        <ContaGarantidaView
          banks={banks}
          initialContas={contas}
          evolucao={{ data: evolucaoData, series: evolucao.series }}
        />
      </div>
    </div>
  );
}
