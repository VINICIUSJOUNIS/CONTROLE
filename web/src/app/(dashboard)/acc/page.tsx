import { Topbar } from "@/components/layout/topbar";
import { AccView } from "@/components/acc/acc-view";
import { getAccOperations, getBanks } from "@/lib/data";

export default async function AccPage() {
  const [banks, accOperations] = await Promise.all([getBanks(), getAccOperations()]);

  return (
    <div className="flex flex-col">
      <Topbar title="ACC" subtitle="Adiantamento sobre Contrato de Cambio - controle de operacoes" />
      <div className="p-6">
        <AccView banks={banks} accOperations={accOperations} />
      </div>
    </div>
  );
}
