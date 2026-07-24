import { Topbar } from "@/components/layout/topbar";
import { AccView } from "@/components/acc/acc-view";

export default function AccPage() {
  return (
    <div className="flex flex-col">
      <Topbar title="ACC" subtitle="Adiantamento sobre Contrato de Cambio - controle de operacoes" />
      <div className="p-6">
        <AccView />
      </div>
    </div>
  );
}
