import { Topbar } from "@/components/layout/topbar";
import { WorldMap } from "@/components/faturamento/world-map";
import { getSales } from "@/lib/data";

export default async function FaturamentoPaisesPage() {
  const sales = await getSales();

  return (
    <div className="flex flex-col">
      <Topbar title="Países Exportados" subtitle="Para onde já exportamos, por cliente externo" />
      <div className="p-6">
        <WorldMap sales={sales} />
      </div>
    </div>
  );
}
