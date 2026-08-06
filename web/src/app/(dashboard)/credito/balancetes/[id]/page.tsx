import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/prisma";
import { statementRecordToFields } from "@/lib/financial/convert";
import { EditStatementClient } from "./edit-client";
import { RiskPanel } from "@/components/credito/risk-panel";

export default async function EditBalancetePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.financialStatement.findUnique({ where: { id } });
  if (!record) notFound();

  const fields = statementRecordToFields(record);
  const aiInsights = record.aiInsights as { riscos?: string[]; geradoEm?: string } | null;

  return (
    <>
      <Topbar title="Editar Balancete" subtitle={record.periodLabel} />
      <div className="space-y-6 p-6">
        <EditStatementClient id={id} initial={fields} />
        <RiskPanel statementId={id} riscos={aiInsights?.riscos ?? []} geradoEm={aiInsights?.geradoEm ?? null} />
      </div>
    </>
  );
}
