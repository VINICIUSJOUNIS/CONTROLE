import { Topbar } from "@/components/layout/topbar";
import { TransferenciaOrdemView } from "@/components/transferencia-ordem/transferencia-ordem-view";
import { getBanksWithTransferChannel, getTransferenciasOrdem } from "@/lib/data";

export default async function TransferenciaOrdemPage() {
  const [banks, transferencias] = await Promise.all([
    getBanksWithTransferChannel(),
    getTransferenciasOrdem(),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar
        title="Transferência de Ordem"
        subtitle="Carta de transferência de ordem de pagamento do exterior, no papel timbrado"
      />
      <div className="p-6">
        <TransferenciaOrdemView banks={banks} initialTransferencias={transferencias} />
      </div>
    </div>
  );
}
