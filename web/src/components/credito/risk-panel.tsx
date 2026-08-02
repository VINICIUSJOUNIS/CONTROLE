"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { regenerateRiskInsightsAction } from "@/app/(dashboard)/credito/actions";

export function RiskPanel({
  statementId,
  riscos,
  geradoEm,
}: {
  statementId: string;
  riscos: string[];
  geradoEm: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateRiskInsightsAction(statementId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Principais Riscos</CardTitle>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isPending}>
          {isPending ? "Analisando..." : "Reanalisar"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        {riscos.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma análise gerada ainda para este período. Clique em &quot;Reanalisar&quot;.
          </p>
        ) : (
          <ul className="space-y-2">
            {riscos.map((risco, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />
                {risco}
              </li>
            ))}
          </ul>
        )}
        {geradoEm && (
          <p className="mt-3 text-xs text-muted">
            Gerado em {new Date(geradoEm).toLocaleString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
