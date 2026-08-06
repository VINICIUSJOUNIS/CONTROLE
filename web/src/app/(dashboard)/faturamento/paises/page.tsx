import { Topbar } from "@/components/layout/topbar";
import { WorldMap } from "@/components/faturamento/world-map";
import { getSales } from "@/lib/data";

export default async function FaturamentoPaisesPage() {
  // Devolucao de venda nao guarda pais nem tipo de cliente (varias sao do mercado
  // interno), entao nao da pra abater aqui sem arriscar atribuir devolucao domestica
  // como se fosse export perdido de algum pais. Fica de fora ate a devolucao ter
  // esse dado proprio.
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
