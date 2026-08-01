"use client";

import { useRouter } from "next/navigation";
import { StatementForm } from "@/components/financial/statement-form";
import { updateStatementAction } from "@/app/(dashboard)/balancetes/actions";
import type { FinancialStatementFields } from "@/lib/financial/schema";

export function EditStatementClient({ id, initial }: { id: string; initial: FinancialStatementFields }) {
  const router = useRouter();

  async function handleSubmit(fields: FinancialStatementFields) {
    const result = await updateStatementAction(id, fields);
    if (!result.ok) throw new Error(result.error);
    router.push("/balancetes");
  }

  return <StatementForm initial={initial} submitLabel="Salvar Alterações" onSubmit={handleSubmit} />;
}
