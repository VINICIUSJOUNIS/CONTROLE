import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getAlertasPrazos } from "@/lib/hedge-data";
import { statusToSlug } from "@/lib/contrato-shared";
import { formatDate } from "@/lib/format";
import { AlertTriangle, Clock } from "lucide-react";

export default async function AlertasPrazosPage() {
  const alertas = await getAlertasPrazos();
  const atrasados = alertas.filter((a) => a.alerta.tone === "danger");
  const proximos = alertas.filter((a) => a.alerta.tone === "warning");

  return (
    <div className="flex flex-col">
      <Topbar title="Alerta de Prazos" subtitle="Prazos criticos da etapa atual de cada contrato" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            label="Atrasados"
            value={String(atrasados.length)}
            icon={AlertTriangle}
            tone="teal"
            valueClassName={atrasados.length > 0 ? "text-danger" : undefined}
          />
          <KpiCard label="Vencendo (ate 3 dias)" value={String(proximos.length)} icon={Clock} tone="soft" />
        </div>

        {alertas.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            Nenhum contrato com prazo vencido ou proximo do vencimento na etapa atual.
          </Card>
        ) : (
          <div className="space-y-2">
            {alertas.map((a) => (
              <Link
                key={`${a.contratoId}-${a.etapa}`}
                href={`/hedge/mesa-operacao/${statusToSlug(a.etapa)}`}
                className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border p-3 transition-colors hover:bg-border/20 ${
                  a.alerta.tone === "danger" ? "border-danger/40 bg-danger/5" : "border-warning/40 bg-warning/5"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.contractNumber}</p>
                  <p className="text-sm text-muted">{a.clienteName}</p>
                </div>
                <p className="shrink-0 text-sm text-muted">{a.etapaLabel}</p>
                <p className="shrink-0 text-sm text-muted">Previsto: {formatDate(a.dataPrevisao)}</p>
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    a.alerta.tone === "danger" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"
                  }`}
                >
                  <AlertTriangle size={12} />
                  {a.alerta.label}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
