import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { HedgeAbaView } from "@/components/hedge-cambial/aba-view";
import { getAbaConfig } from "@/lib/hedge-cambial/config";
import { ctxDe, getCadastrosDaAba, getParametros, getRegistros } from "@/lib/hedge-cambial/data";
import { hedgeCambialAbas } from "@/lib/hedge-cambial-abas";

export function generateStaticParams() {
  return hedgeCambialAbas.map((a) => ({ aba: a.slug }));
}

export default async function HedgeCambialAbaPage({ params }: { params: Promise<{ aba: string }> }) {
  const { aba: slug } = await params;
  const config = getAbaConfig(slug);
  if (!config) notFound();

  const [registros, parametros, cadastros] = await Promise.all([getRegistros(slug), getParametros(), getCadastrosDaAba(config)]);

  return (
    <div className="flex flex-col">
      <Topbar title={config.label} subtitle={config.descricao} />
      <div className="p-6">
        <HedgeAbaView slug={slug} registros={registros} ctx={ctxDe(parametros)} cadastros={cadastros} />
      </div>
    </div>
  );
}
