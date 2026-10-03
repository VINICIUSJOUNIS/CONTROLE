import { Topbar } from "@/components/layout/topbar";
import { NoticiasView } from "@/components/hedge-cambial/noticias-view";
import { getUltimasNoticias } from "@/lib/hedge-cambial/noticias";

export default async function HedgeNoticiasPage() {
  const { dolar, fontes, buscadoEm } = await getUltimasNoticias();

  return (
    <div className="flex flex-col">
      <Topbar title="Ultimas Noticias" subtitle="Mercado de dolar - atualiza a cada 5 minutos" />
      <div className="p-6">
        <NoticiasView dolar={dolar} fontes={fontes} buscadoEm={buscadoEm} />
      </div>
    </div>
  );
}
