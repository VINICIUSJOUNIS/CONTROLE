import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteStatementButton } from "@/components/credito/delete-statement-button";
import { prisma } from "@/lib/prisma";

export default async function BalancetesPage() {
  const records = await prisma.financialStatement.findMany({
    orderBy: { referenceDate: "desc" },
  });

  return (
    <>
      <Topbar title="Balanço e DRE" subtitle="Períodos lançados" />
      <div className="space-y-4 p-6">
        <div className="flex justify-end">
          <Link
            href="/credito/importar"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Novo Balanço e DRE
          </Link>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {records.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Nenhum balanço/DRE lançado ainda.</p>
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
                        <Link href={`/credito/balancetes/${r.id}`} className="hover:underline">
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
