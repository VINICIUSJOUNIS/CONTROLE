import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { getHedgeCambialAba, hedgeCambialAbas } from "@/lib/hedge-cambial-abas";

export function generateStaticParams() {
  return hedgeCambialAbas.map((a) => ({ aba: a.slug }));
}

export default async function HedgeCambialAbaPage({ params }: { params: Promise<{ aba: string }> }) {
  const { aba: slug } = await params;
  const aba = getHedgeCambialAba(slug);
  if (!aba) notFound();

  return (
    <div className="flex flex-col">
      <Topbar title={aba.label} subtitle="Hedge" />
      <div className="space-y-6 p-6">
        <p className="text-center text-muted">Modulo em construcao.</p>
      </div>
    </div>
  );
}
