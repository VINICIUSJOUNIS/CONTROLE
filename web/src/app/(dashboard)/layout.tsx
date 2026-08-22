import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentProfile } from "@/lib/auth";
import { getContratosExportacaoCountByStatus, getAlertasPrazos } from "@/lib/hedge-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, mesaOperacaoCountByStatus, alertasPrazos] = await Promise.all([
    getCurrentProfile(),
    getContratosExportacaoCountByStatus(),
    getAlertasPrazos(),
  ]);
  const mesaOperacaoCount = Object.values(mesaOperacaoCountByStatus).reduce((s, n) => s + n, 0);
  const alertasPrazosCount = alertasPrazos.length;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        profile={profile}
        mesaOperacaoCount={mesaOperacaoCount}
        mesaOperacaoCountByStatus={mesaOperacaoCountByStatus}
        alertasPrazosCount={alertasPrazosCount}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
