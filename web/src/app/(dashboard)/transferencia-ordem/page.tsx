import { Topbar } from "@/components/layout/topbar";
import { TransferenciaOrdemView } from "@/components/transferencia-ordem/transferencia-ordem-view";
import { getBanks } from "@/lib/data";

export default async function TransferenciaOrdemPage() {
  const banks = await getBanks();

  return (
    <div className="flex flex-col">
      <Topbar
        title="Transferência de Ordem"
        subtitle="Carta de transferência de ordem de pagamento do exterior, no papel timbrado"
      />
      <div className="p-6">
        <TransferenciaOrdemView banks={banks} />
      </div>
    </div>
  );
}
