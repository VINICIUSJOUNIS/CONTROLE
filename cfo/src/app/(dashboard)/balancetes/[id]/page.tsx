import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/prisma";
import { statementRecordToFields } from "@/lib/financial/convert";
import { EditStatementClient } from "./edit-client";

export default async function EditBalancetePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.financialStatement.findUnique({ where: { id } });
  if (!record) notFound();

  const fields = statementRecordToFields(record);

  return (
    <>
      <Topbar title="Editar Balancete" subtitle={record.periodLabel} />
      <div className="p-6">
        <EditStatementClient id={id} initial={fields} />
      </div>
    </>
  );
}
