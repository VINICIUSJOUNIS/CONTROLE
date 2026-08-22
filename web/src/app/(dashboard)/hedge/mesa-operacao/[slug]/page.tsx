import { notFound } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import {
  getContratosExportacao,
  getConfirmacoesNegocio,
  getClientes,
  getCorretoras,
  getTiposEmbalagem,
  getContratoAnexosPorEtapa,
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

  const [confirmacoes, clientes, corretoras, tiposEmbalagem] = await Promise.all([
    getConfirmacoesNegocio(),
    getClientes(),
    getCorretoras(),
    getTiposEmbalagem(),
  ]);

  return (
    <ConfirmacaoNegocioList
      contratos={contratos}
      confirmacoes={confirmacoes}
      clientes={clientes}
      corretoras={corretoras}
      tiposEmbalagem={tiposEmbalagem}
    />
  );
}

async function EtapaGenerica({
  contratos,
  status,
}: {
  contratos: Awaited<ReturnType<typeof getContratosExportacao>>;
  status: NonNullable<ReturnType<typeof slugToStatus>>;
}) {
  const anexos = await getContratoAnexosPorEtapa(status);

  return <EtapaContratosList contratos={contratos} status={status} anexos={anexos} />;
}
