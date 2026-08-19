import { Topbar } from "@/components/layout/topbar";
import { WorldMapCard } from "@/components/hedge/world-map-card";
import { getExportacaoPorPais } from "@/lib/hedge-data";

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
