import { Sidebar } from "@/components/layout/sidebar";
import { CabecalhoModulos } from "@/components/layout/cabecalho-modulos";
import { SidebarProvider } from "@/components/layout/sidebar-state";
import { ControleInatividade } from "@/components/auth/inatividade";
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
    <SidebarProvider>
      <ControleInatividade />
      <CabecalhoModulos />
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <Sidebar
          profile={profile}
          mesaOperacaoCount={mesaOperacaoCount}
          mesaOperacaoCountByStatus={mesaOperacaoCountByStatus}
          alertasPrazosCount={alertasPrazosCount}
        />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </SidebarProvider>
  );
}
