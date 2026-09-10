import { Topbar } from "@/components/layout/topbar";
import { ContratoCompraView } from "@/components/hedge/contrato-compra-view";
import { getContratosCompraCafe } from "@/lib/data";

export default async function ContratoCompraPage() {
  const contratos = await getContratosCompraCafe();

  return (
    <div className="flex flex-col">
      <Topbar
        title="Contrato de Compra"
        subtitle="Formulário do contrato de compra de café (OC), no mesmo layout do fornecedor"
      />
      <div className="p-6">
        <ContratoCompraView initialContratos={contratos} />
      </div>
    </div>
  );
}
