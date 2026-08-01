"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Input } from "@/components/ui/field";
import { StatementForm } from "@/components/financial/statement-form";
import { saveFinancialStatementAction } from "./actions";
import { emptyFinancialStatementFields, type FinancialStatementFields } from "@/lib/financial/schema";

export default function ImportarPage() {
  const router = useRouter();
  const [sourceFileName, setSourceFileName] = useState("");

  async function handleSave(fields: FinancialStatementFields) {
    const result = await saveFinancialStatementAction(fields, sourceFileName.trim() || "Lançamento manual");
    if (!result.ok) {
      throw new Error(result.error);
    }
    router.push("/");
  }

  return (
    <>
      <Topbar title="Novo Balancete" subtitle="Digite os valores do balanço/balancete manualmente" />
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="p-5">
            <Label htmlFor="sourceFileName">Documento de referência (opcional)</Label>
            <Input
              id="sourceFileName"
              placeholder="ex: Balancete 2º Trimestre.pdf"
              value={sourceFileName}
              onChange={(e) => setSourceFileName(e.target.value)}
            />
          </CardContent>
        </Card>

        <StatementForm
          initial={emptyFinancialStatementFields()}
          submitLabel="Salvar Balancete"
          onSubmit={handleSave}
        />
      </div>
    </>
  );
}
