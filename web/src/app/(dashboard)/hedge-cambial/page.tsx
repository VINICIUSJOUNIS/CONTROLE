import { Topbar } from "@/components/layout/topbar";
import { HedgeDashboardView } from "@/components/hedge-cambial/dashboard-view";
import { calcularDashboard } from "@/lib/hedge-cambial/dashboard";
import { ctxDe, getParametros, getRegistrosPorAba } from "@/lib/hedge-cambial/data";

export default async function HedgeCambialPage() {
  const [abas, parametros] = await Promise.all([getRegistrosPorAba(), getParametros()]);
  const dashboard = calcularDashboard(abas, ctxDe(parametros), parametros.posicaoB3);

  return (
    <div className="flex flex-col">
      <Topbar title="Dashboard Hedge" subtitle="Posicao NAYME em sacas e LONG x SHORT dolar" />
      <div className="p-6">
        <HedgeDashboardView dashboard={dashboard} parametros={parametros} />
      </div>
    </div>
  );
}
