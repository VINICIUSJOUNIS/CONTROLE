import { Topbar } from "@/components/layout/topbar";
import { WorldMap } from "@/components/faturamento/world-map";
import { getSales } from "@/lib/data";

export default async function ApresentacaoPaisesPage() {
  const sales = await getSales();

  return (
    <div className="flex flex-col">
      <Topbar title="Países Exportados" />
      <div className="space-y-6 p-6">
        <WorldMap sales={sales} />
      </div>
    </div>
  );
}
