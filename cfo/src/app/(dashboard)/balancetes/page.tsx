import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteStatementButton } from "@/components/financial/delete-statement-button";
import { prisma } from "@/lib/prisma";

export default async function BalancetesPage() {
  const records = await prisma.financialStatement.findMany({
    orderBy: { referenceDate: "desc" },
  });

  return (
    <>
      <Topbar title="Balancetes" subtitle="Períodos importados" />
      <div className="p-6">
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {records.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Nenhum balancete importado ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="p-4">Período</th>
                    <th className="p-4">Data de Fechamento</th>
                    <th className="p-4">Arquivo</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="p-4 font-medium">
                        <Link href={`/balancetes/${r.id}`} className="hover:underline">
                          {r.periodLabel}
                        </Link>
                      </td>
                      <td className="p-4">
                        {r.referenceDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </td>
                      <td className="p-4 text-muted">{r.sourceFileName}</td>
                      <td className="p-4 text-right">
                        <DeleteStatementButton id={r.id} periodLabel={r.periodLabel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
