import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import {
  getContratosExportacao,
  getConfirmacoesNegocio,
  getClientes,
  getCorretoras,
  getTiposFrete,
  getTiposEmbalagem,
  getFormasPagamento,
  getPeneiras,
  getPadroesCafe,
  getContratoAnexosPorContrato,
  getPrevisoesPorEtapa,
  getConcluidasPorEtapa,
  getHistoricoAnteriorPorContrato,
  getEnviosAmostra,
  getTiposAmostra,
  getTransportadorasAmostra,
  syncClientesFromVendasExternas,
} from "@/lib/hedge-data";
import { slugToStatus, statusLabels } from "@/lib/contrato-shared";
import { ConfirmacaoNegocioList } from "@/components/hedge/contratos/confirmacao-negocio-list";
import { EtapaContratosList } from "@/components/hedge/contratos/etapa-contratos-list";
import { ArrowLeft } from "lucide-react";

export default async function MesaOperacaoEtapaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const status = slugToStatus(slug);
  if (!status) notFound();

  const contratos = await getContratosExportacao();
  const items = contratos.filter((c) => c.status === status);

  return (
    <div className="flex flex-col">
      <Topbar title={statusLabels[status]} subtitle="Contratos nesta etapa da Mesa de Operação" />
      <div className="space-y-4 p-6">
        <Link
          href="/hedge/mesa-operacao"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Voltar para a Mesa de Operações
        </Link>

        {status === "CONFIRMACAO_NEGOCIO" ? (
          <ConfirmacaoNegocioEtapa contratos={items} />
        ) : (
          <EtapaGenerica contratos={items} status={status} />
        )}
      </div>
    </div>
  );
}

async function ConfirmacaoNegocioEtapa({ contratos }: { contratos: Awaited<ReturnType<typeof getContratosExportacao>> }) {
  await syncClientesFromVendasExternas();

  const [
    confirmacoes,
    clientes,
    corretoras,
    tiposFrete,
    tiposEmbalagem,
    formasPagamento,
    peneiras,
    padroesCafe,
    concluidas,
    previsoes,
    anexos,
  ] = await Promise.all([
    getConfirmacoesNegocio(),
    getClientes(),
    getCorretoras(),
    getTiposFrete(),
    getTiposEmbalagem(),
    getFormasPagamento(),
    getPeneiras(),
    getPadroesCafe(),
    getConcluidasPorEtapa("CONFIRMACAO_NEGOCIO"),
    getPrevisoesPorEtapa("CONFIRMACAO_NEGOCIO"),
    getContratoAnexosPorContrato(),
  ]);

  return (
    <Suspense>
      <ConfirmacaoNegocioList
        contratos={contratos}
        confirmacoes={confirmacoes}
        clientes={clientes}
        corretoras={corretoras}
        tiposFrete={tiposFrete}
        tiposEmbalagem={tiposEmbalagem}
        formasPagamento={formasPagamento}
        peneiras={peneiras}
        padroesCafe={padroesCafe}
        concluidas={concluidas}
        previsoes={previsoes}
        anexos={anexos}
      />
    </Suspense>
  );
}

async function EtapaGenerica({
  contratos,
  status,
}: {
  contratos: Awaited<ReturnType<typeof getContratosExportacao>>;
  status: NonNullable<ReturnType<typeof slugToStatus>>;
}) {
  const [anexos, previsoes, historico, concluidas] = await Promise.all([
    getContratoAnexosPorContrato(),
    getPrevisoesPorEtapa(status),
    getHistoricoAnteriorPorContrato(status),
    getConcluidasPorEtapa(status),
  ]);

  if (status === "ENVIO_AMOSTRA_PSS") {
    const [enviosAmostra, tiposAmostra, transportadorasAmostra] = await Promise.all([
      getEnviosAmostra(),
      getTiposAmostra(),
      getTransportadorasAmostra(),
    ]);

    return (
      <Suspense>
        <EtapaContratosList
          contratos={contratos}
          status={status}
          anexos={anexos}
          previsoes={previsoes}
          historico={historico}
          concluidas={concluidas}
          enviosAmostra={enviosAmostra}
          tiposAmostra={tiposAmostra}
          transportadorasAmostra={transportadorasAmostra}
        />
      </Suspense>
    );
  }

  return (
    <Suspense>
      <EtapaContratosList
        contratos={contratos}
        status={status}
        anexos={anexos}
        previsoes={previsoes}
        historico={historico}
        concluidas={concluidas}
      />
    </Suspense>
  );
}
