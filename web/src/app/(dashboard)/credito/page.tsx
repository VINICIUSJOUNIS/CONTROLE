import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnviarPdfs } from "@/components/credito/enviar-pdfs";
import { ExcluirMes } from "@/components/credito/excluir-mes";
import { listarRegistrosCredito } from "@/lib/credito/dados";
import { analisar, formatar, rotuloCompetencia } from "@/lib/credito/calculos";

export default async function CreditoPage() {
  const registros = await listarRegistrosCredito();
  const linhas = registros
    .map((r) => {
      const a = analisar(r, registros);
      const ind = (k: string) => a.secoes.flatMap((s) => s.indicadores).find((i) => i.chave === k);
      const total = a.ativo.find((l) => l.nivel === 0)?.valor ?? 0;
      const rl = a.dre.find((l) => l.rotulo === "Receita Líquida")?.valor ?? 0;
      const ll = a.dre.find((l) => l.rotulo === "Lucro Líquido do Período")?.valor ?? 0;
      return { r, total, rl, ll, ncg: ind("ncg")?.valor ?? null, liq: ind("liquidezCorrente")?.valor ?? null, alertas: a.conferencias.filter((c) => !c.ok).length };
    })
    .reverse();

  return (
    <>
      <Topbar title="Analise de Credito" subtitle="Balanço e DRE mensais lidos do PDF pela IA, com indicadores de crédito explicados" />
      <div className="space-y-6 p-6">
        <EnviarPdfs />
        <Card>
          <CardHeader>
            <CardTitle>Meses analisados</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {linhas.length === 0 ? (
              <p className="py-4 text-sm text-muted">Nenhum mês incluído ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="py-2 text-left font-medium">Competência</th>
                    <th className="py-2 text-right font-medium">Ativo total</th>
                    <th className="py-2 text-right font-medium">Receita líquida</th>
                    <th className="py-2 text-right font-medium">Lucro líquido</th>
                    <th className="py-2 text-right font-medium">NCG</th>
                    <th className="py-2 text-right font-medium">Liquidez corrente</th>
                    <th className="py-2 text-right font-medium">Conferência</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(({ r, total, rl, ll, ncg, liq, alertas }) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2">
                        <Link href={`/credito/${r.competencia}`} className="font-medium text-primary hover:underline">
                          {rotuloCompetencia(r.competencia)}
                        </Link>
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatar(total, "moeda")}</td>
                      <td className="py-2 text-right tabular-nums">{formatar(rl, "moeda")}</td>
                      <td className="py-2 text-right tabular-nums">{formatar(ll, "moeda")}</td>
                      <td className="py-2 text-right tabular-nums">{formatar(ncg, "moeda")}</td>
                      <td className="py-2 text-right tabular-nums">{formatar(liq, "vezes")}</td>
                      <td className={alertas ? "py-2 text-right text-warning" : "py-2 text-right text-success"}>
                        {alertas ? `${alertas} divergência(s)` : "OK"}
                      </td>
                      <td className="py-2 text-right">
                        <ExcluirMes id={r.id} rotulo={rotuloCompetencia(r.competencia)} />
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
