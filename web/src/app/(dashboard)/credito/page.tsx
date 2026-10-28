import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnviarPdfs } from "@/components/credito/enviar-pdfs";
import { ExcluirMes } from "@/components/credito/excluir-mes";
import { listarRegistrosCredito, listarTrimestresCredito } from "@/lib/credito/dados";
import { analisar, formatar, rotuloCompetencia, type Analise } from "@/lib/credito/calculos";
import { analisarTrimestrePdf, rotuloTrimestre } from "@/lib/credito/comparativo";

function resumo(a: Analise) {
  const ind = (k: string) => a.secoes.flatMap((s) => s.indicadores).find((i) => i.chave === k);
  return {
    meses: a.periodo.meses,
    total: a.ativo.find((l) => l.nivel === 0)?.valor ?? 0,
    rl: a.dre.find((l) => l.rotulo === "Receita Líquida")?.valor ?? 0,
    ll: a.dre.find((l) => l.rotulo === "Lucro Líquido do Período")?.valor ?? 0,
    ncg: ind("ncg")?.valor ?? null,
    liq: ind("liquidezCorrente")?.valor ?? null,
  };
}

export default async function CreditoPage() {
  const [registros, trimestres] = await Promise.all([listarRegistrosCredito(), listarTrimestresCredito()]);
  const linhas = registros.map((r) => ({ r, ...resumo(analisar(r, registros)) })).reverse();
  const linhasTri = trimestres.map((t) => ({ t, ...resumo(analisarTrimestrePdf(t, trimestres, registros)) })).reverse();

  return (
    <>
      <Topbar title="Analise de Credito" subtitle="Balanço e DRE mensais e trimestrais lidos do PDF pela IA, com indicadores de crédito explicados" />
      <div className="space-y-6 p-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <EnviarPdfs />
          <EnviarPdfs periodo="trimestre" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Trimestres analisados</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {linhasTri.length === 0 ? (
              <p className="py-4 text-sm text-muted">Nenhum trimestre incluído ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="py-2 text-left font-medium">Trimestre</th>
                    <th className="py-2 text-right font-medium">Ativo total</th>
                    <th className="py-2 text-right font-medium">Receita líquida</th>
                    <th className="py-2 text-right font-medium">Lucro líquido</th>
                    <th className="py-2 text-right font-medium">NCG</th>
                    <th className="py-2 text-right font-medium">Liquidez corrente</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {linhasTri.map(({ t, meses, total, rl, ll, ncg, liq }) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-2">
                        <Link href={`/credito/trimestre/${t.trimestre}`} className="font-medium text-primary hover:underline">
                          {rotuloTrimestre(t.trimestre)}
                        </Link>
                        {meses !== 3 && <span className="ml-2 text-xs text-warning">DRE de {meses} meses</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatar(total, "moeda")}</td>
                      <td className="py-2 text-right tabular-nums">{formatar(rl, "moeda")}</td>
                      <td className="py-2 text-right tabular-nums">{formatar(ll, "moeda")}</td>
                      <td className="py-2 text-right tabular-nums">{formatar(ncg, "moeda")}</td>
                      <td className="py-2 text-right tabular-nums">{formatar(liq, "vezes")}</td>
                      <td className="py-2 text-right">
                        <ExcluirMes id={t.id} rotulo={rotuloTrimestre(t.trimestre)} trimestre />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
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
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(({ r, total, rl, ll, ncg, liq }) => (
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
