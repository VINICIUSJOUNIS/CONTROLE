import { Topbar } from "@/components/layout/topbar";
import {
  getClientes,
  getCorretoras,
  getTiposFrete,
  getTiposEmbalagem,
  getFormasPagamento,
  getTiposAmostra,
  getTransportadorasAmostra,
  getPeneiras,
  getPadroesCafe,
} from "@/lib/hedge-data";
import { CadastrosView } from "@/components/hedge/cadastros/cadastros-view";

export default async function CadastrosPage() {
  const [
    clientes,
    corretoras,
    tiposFrete,
    tiposEmbalagem,
    formasPagamento,
    tiposAmostra,
    transportadorasAmostra,
    peneiras,
    padroesCafe,
  ] = await Promise.all([
    getClientes(),
    getCorretoras(),
    getTiposFrete(),
    getTiposEmbalagem(),
    getFormasPagamento(),
    getTiposAmostra(),
    getTransportadorasAmostra(),
    getPeneiras(),
    getPadroesCafe(),
  ]);

  return (
    <div className="flex flex-col">
      <Topbar
        title="Cadastros"
        subtitle="Edite ou exclua clientes, corretoras e as listas usadas nos contratos"
      />
      <div className="p-6">
        <CadastrosView
          clientes={clientes}
          corretoras={corretoras}
          tiposFrete={tiposFrete}
          tiposEmbalagem={tiposEmbalagem}
          formasPagamento={formasPagamento}
          tiposAmostra={tiposAmostra}
          transportadorasAmostra={transportadorasAmostra}
          peneiras={peneiras}
          padroesCafe={padroesCafe}
        />
      </div>
    </div>
  );
}
