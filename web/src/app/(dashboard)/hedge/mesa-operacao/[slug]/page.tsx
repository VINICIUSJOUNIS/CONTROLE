import { notFound } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { formatCompactCurrency, formatDate } from "@/lib/format";
import { getContratosExportacao, getConfirmacoesNegocio, getClientes, getCorretoras } from "@/lib/hedge-data";
import { slugToStatus, statusLabels, relevantDateField, dateFieldLabels } from "@/lib/contrato-shared";
import { ConfirmacaoNegocioList } from "@/components/hedge/contratos/confirmacao-negocio-list";
import { MapPin, Calendar, ArrowLeft } from "lucide-react";

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
  const [confirmacoes, clientes, corretoras] = await Promise.all([
    getConfirmacoesNegocio(),
    getClientes(),
    getCorretoras(),
  ]);

  return (
    <ConfirmacaoNegocioList
      contratos={contratos}
      confirmacoes={confirmacoes}
      clientes={clientes}
      corretoras={corretoras}
    />
  );
}

function EtapaGenerica({
  contratos,
  status,
}: {
  contratos: Awaited<ReturnType<typeof getContratosExportacao>>;
  status: NonNullable<ReturnType<typeof slugToStatus>>;
}) {
  const dateField = relevantDateField[status];

  if (contratos.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted">Nenhum contrato nesta etapa.</Card>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {contratos.map((item) => {
        const dateValue = item[dateField];
        return (
          <div key={item.id} className="w-64 shrink-0 rounded-lg border border-border bg-card p-3">
            <p className="font-semibold">{item.contractNumber}</p>
            <p className="text-sm">{item.clienteName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <MapPin size={12} />
              {item.country}
            </p>
            <p className="mt-2 text-sm font-medium text-primary">
              {formatCompactCurrency(item.valorUsd, "USD")}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Calendar size={12} />
              {dateValue
                ? `${dateFieldLabels[dateField]}: ${formatDate(dateValue)}`
                : `${dateFieldLabels[dateField]}: sem data`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
