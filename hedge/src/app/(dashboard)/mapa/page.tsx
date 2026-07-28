import { Topbar } from "@/components/layout/topbar";
import { WorldMapCard } from "@/components/dashboard/world-map-card";
import { getExportacaoPorPais } from "@/lib/data";

export default async function MapaPage() {
  const paises = await getExportacaoPorPais();

  return (
    <div className="flex flex-col">
      <Topbar title="Mapa de Exportacao" subtitle="Paises para onde exportamos" />
      <div className="p-6">
        <WorldMapCard paises={paises} />
      </div>
    </div>
  );
}
