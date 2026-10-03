import { Topbar } from "@/components/layout/topbar";
import { CambioBcbView } from "@/components/hedge-cambial/cambio-bcb-view";
import { getPainelCambio } from "@/lib/hedge-cambial/cambio-bcb";

export default async function CambioBcbPage() {
  const painel = await getPainelCambio();

  return (
    <div className="flex flex-col">
      <Topbar title="Cambio BCB" subtitle="Dados oficiais do Banco Central: PTAX do dia, projecao Focus e atuacoes no cambio" />
      <div className="p-6">
        <CambioBcbView painel={painel} />
      </div>
    </div>
  );
}
