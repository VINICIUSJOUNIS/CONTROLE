import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentProfile } from "@/lib/auth";
import { getContratosExportacaoCount } from "@/lib/hedge-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, mesaOperacaoCount] = await Promise.all([
    getCurrentProfile(),
    getContratosExportacaoCount(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} mesaOperacaoCount={mesaOperacaoCount} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
