import { Topbar } from "@/components/layout/topbar";
import { ComparativoTabela } from "@/components/credito/comparativo-tabela";
import { listarRegistrosCredito } from "@/lib/credito/dados";
import { colunasTrimestrais, linhasComparativo } from "@/lib/credito/comparativo";

export default async function TrimestreAcumuladoPage() {
  const registros = await listarRegistrosCredito();
  const colunas = colunasTrimestrais(registros);

  return (
    <>
      <Topbar title="Trimestre Acumulado" subtitle="Análise de Crédito - DRE somada do trimestre e indicadores do período" />
      <div className="space-y-4 p-6">
        {colunas.length === 0 ? (
          <p className="text-sm text-muted">Nenhum mês incluído ainda.</p>
        ) : (
          <>
            <p className="text-xs text-muted">
              DRE: soma dos meses do trimestre. Balanço: fim do último mês do trimestre. Prazos, margens e retornos usam o período do
              trimestre (dias e anualização pelos meses somados). Trimestre parcial (em amarelo) soma só os meses já incluídos.
            </p>
            <ComparativoTabela colunas={colunas} linhas={linhasComparativo(colunas)} />
          </>
        )}
      </div>
    </>
  );
}
