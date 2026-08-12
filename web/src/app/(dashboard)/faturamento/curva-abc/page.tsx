import { Topbar } from "@/components/layout/topbar";
import { CurvaAbcView } from "@/components/faturamento/curva-abc-view";
import { getSales } from "@/lib/data";

export default async function CurvaAbcPage() {
  const allSales = await getSales();
  const internos = allSales.filter((s) => s.clientType === "INTERNO");
  const externos = allSales.filter((s) => s.clientType === "EXTERNO");

  return (
    <div className="flex flex-col">
      <Topbar
        title="Curva ABC"
        subtitle="Classificação ABC dos 10 maiores clientes — mercado interno e externo"
      />
      <div className="p-6">
        <CurvaAbcView internos={internos} externos={externos} />
      </div>
    </div>
  );
}
