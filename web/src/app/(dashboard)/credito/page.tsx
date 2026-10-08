import { Topbar } from "@/components/layout/topbar";
import { AnaliseBalancete } from "@/components/credito/analise-balancete";

export default function CreditoPage() {
  return (
    <>
      <Topbar title="Analise de Credito" subtitle="Envie o PDF do balancete para a análise do analista financeiro (IA)" />
      <div className="p-6">
        <AnaliseBalancete />
      </div>
    </>
  );
}
