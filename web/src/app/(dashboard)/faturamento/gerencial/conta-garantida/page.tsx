import { Topbar } from "@/components/layout/topbar";
import { ContaGarantidaResumo } from "@/components/conta-garantida/conta-garantida-resumo";
import { getContasGarantidas } from "@/lib/data";

export default async function ApresentacaoContaGarantidaPage() {
  const contas = await getContasGarantidas();

  return (
    <div className="flex flex-col">
      <Topbar title="Conta Garantida" />
      <div className="space-y-6 p-6">
        <ContaGarantidaResumo initialContas={contas} />
      </div>
    </div>
  );
}
