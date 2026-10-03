import { Topbar } from "@/components/layout/topbar";
import { NoticiasView } from "@/components/hedge-cambial/noticias-view";
import { getUltimasNoticias } from "@/lib/hedge-cambial/noticias";

export default async function HedgeNoticiasPage() {
  const { dolar, cafe, tendencia, buscadoEm } = await getUltimasNoticias();

  return (
    <div className="flex flex-col">
      <Topbar title="Ultimas Noticias" subtitle="Mercado de dolar, mercado de cafe e tendencia da bolsa de NY - atualiza a cada 30 minutos" />
      <div className="p-6">
        <NoticiasView dolar={dolar} cafe={cafe} tendencia={tendencia} buscadoEm={buscadoEm} />
      </div>
    </div>
  );
}
