import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentProfile } from "@/lib/auth";
import { getContratosExportacaoCountByStatus } from "@/lib/hedge-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, mesaOperacaoCountByStatus] = await Promise.all([
    getCurrentProfile(),
    getContratosExportacaoCountByStatus(),
  ]);
  const mesaOperacaoCount = Object.values(mesaOperacaoCountByStatus).reduce((s, n) => s + n, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        profile={profile}
        mesaOperacaoCount={mesaOperacaoCount}
        mesaOperacaoCountByStatus={mesaOperacaoCountByStatus}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
