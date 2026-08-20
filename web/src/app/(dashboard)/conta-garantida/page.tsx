import { Topbar } from "@/components/layout/topbar";
import { ContaGarantidaView } from "@/components/conta-garantida/conta-garantida-view";
import { getBanks, getContasGarantidas } from "@/lib/data";

export default async function ContaGarantidaPage() {
  const [banks, contas] = await Promise.all([getBanks(), getContasGarantidas()]);

  return (
    <div className="flex flex-col">
      <Topbar title="Conta Garantida" subtitle="Limite contratado e utilização por banco" />
      <div className="space-y-6 p-6">
        <ContaGarantidaView banks={banks} initialContas={contas} />
      </div>
    </div>
  );
}
