"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Input } from "@/components/ui/field";
import { StatementForm } from "@/components/credito/statement-form";
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
    router.push("/credito");
  }

  return (
    <>
      <Topbar title="Novo Balanço e DRE" subtitle="Digite os valores do balanço e da DRE manualmente" />
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="p-5">
            <Label htmlFor="sourceFileName">Documento de referência (opcional)</Label>
            <Input
              id="sourceFileName"
              placeholder="ex: Balanço 2º Trimestre.pdf"
              value={sourceFileName}
              onChange={(e) => setSourceFileName(e.target.value)}
            />
          </CardContent>
        </Card>

        <StatementForm
          initial={emptyFinancialStatementFields()}
          submitLabel="Salvar Balanço e DRE"
          onSubmit={handleSave}
        />
      </div>
    </>
  );
}
