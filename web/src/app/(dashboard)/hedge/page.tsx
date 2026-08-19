import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getExportDashboard } from "@/lib/hedge-data";
import { formatCompactCurrency, formatDate } from "@/lib/format";
import { FileText, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const statusLabels: Record<string, string> = {
  CONTRATO_ASSINADO: "Contrato assinado",
  PRE_EMBARQUE: "Pre embarque",
  ESTUFAGEM_PORTO: "Estufagem/Porto",
  EMBARCADO: "Embarcado",
  CARGA_DESTINO: "Carga no destino",
  CONTRATO_FINALIZADO: "Contrato finalizado",
  A_LIQUIDAR: "A liquidar",
  LIQUIDADA: "Liquidada",
};

const statusVariant: Record<string, "default" | "success" | "danger" | "warning" | "neutral"> = {
  CONTRATO_ASSINADO: "neutral",
  PRE_EMBARQUE: "default",
  ESTUFAGEM_PORTO: "default",
  EMBARCADO: "warning",
  CARGA_DESTINO: "warning",
  CONTRATO_FINALIZADO: "success",
  A_LIQUIDAR: "warning",
  LIQUIDADA: "success",
};

export default async function HedgeDashboardPage() {
  const dashboard = await getExportDashboard();

  const cards = [
    {
      label: "Total de Contratos",
      value: String(dashboard.totalContratos),
      icon: FileText,
    },
    {
      label: "Em Andamento",
      value: String(dashboard.emAndamento),
      icon: Clock,
    },
    {
      label: "Concluidos",
      value: String(dashboard.concluidos),
      icon: CheckCircle2,
    },
    {
      label: "Prazos Vencidos",
      value: String(dashboard.prazosVencidos),
      icon: AlertTriangle,
      danger: true,
    },
  ];

  return (
    <div className="flex flex-col">
      <Topbar title="Dashboard" subtitle="Visao geral dos processos de exportacao" />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted">
                <c.icon size={14} className={c.danger ? "text-danger" : "text-primary"} />
                {c.label}
              </div>
              <p className={`mt-2 text-lg font-semibold ${c.danger ? "text-danger" : ""}`}>{c.value}</p>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Proximos Vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full whitespace-nowrap text-xs">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Contrato</th>
                  <th className="px-4 py-3 font-medium">Banco</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.proximosVencimentos.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-border/20">
                    <td className="px-4 py-2.5">{item.tipo}</td>
                    <td className="px-4 py-2.5 font-medium">{item.contrato}</td>
                    <td className="px-4 py-2.5">{item.banco}</td>
                    <td className="px-4 py-2.5">{formatCompactCurrency(item.valor, item.currency)}</td>
                    <td className="px-4 py-2.5">{formatDate(item.vencimento)}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={statusVariant[item.status] ?? "default"}>
                        {statusLabels[item.status] ?? item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {dashboard.proximosVencimentos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted">
                      Nenhum contrato com vencimento futuro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Prazos Criticos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.prazosCriticos.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.contractNumber}</p>
                    <p className="text-xs text-muted">
                      {item.clienteName} - {item.data ? formatDate(item.data) : "-"}
                    </p>
                  </div>
                  <Badge variant="danger">Vencido</Badge>
                </div>
              ))}
              {dashboard.prazosCriticos.length === 0 && (
                <p className="text-sm text-muted">Nenhum prazo vencido no momento.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contratos Recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.contratosRecentes.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.contractNumber}</p>
                    <p className="text-xs text-muted">
                      {item.clienteName} - {item.country}
                    </p>
                  </div>
                  <Badge variant={statusVariant[item.status] ?? "default"}>
                    {statusLabels[item.status] ?? item.status}
                  </Badge>
                </div>
              ))}
              {dashboard.contratosRecentes.length === 0 && (
                <p className="text-sm text-muted">Nenhum contrato cadastrado ainda.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
