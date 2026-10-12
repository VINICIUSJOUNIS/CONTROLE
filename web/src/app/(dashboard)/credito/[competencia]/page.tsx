import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { AnaliseView } from "@/components/credito/analise-view";
import { listarRegistrosCredito } from "@/lib/credito/dados";
import { analisar, rotuloCompetencia } from "@/lib/credito/calculos";

export default async function CreditoMesPage({ params }: { params: Promise<{ competencia: string }> }) {
  const { competencia } = await params;
  const registros = await listarRegistrosCredito();
  const registro = registros.find((r) => r.competencia === competencia);
  if (!registro) notFound();
  const analise = analisar(registro, registros);

  return (
    <>
      <Topbar title={`Analise de Credito - ${rotuloCompetencia(competencia)}`} subtitle={registro.empresa} />
      <div className="space-y-4 p-6">
        <Link href="/credito" className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden">
          <ArrowLeft size={14} />
          Todos os meses
        </Link>
        <AnaliseView analise={analise} />
      </div>
    </>
  );
}
