import { Topbar } from "@/components/layout/topbar";
import { CabecalhoApresentacao } from "@/components/apresentacao/cabecalho";
import { LineChartCard } from "@/components/charts/line-chart-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listarRegistrosCredito } from "@/lib/credito/dados";
import { analisar, formatar, rotuloCompetencia, type Analise, type Indicador, type Tom } from "@/lib/credito/calculos";

const corTom: Record<Tom, "success" | "warning" | "danger" | "neutral"> = { bom: "success", atencao: "warning", ruim: "danger", neutro: "neutral" };
const rotuloTom: Record<Tom, string> = { bom: "Saudável", atencao: "Atenção", ruim: "Crítico", neutro: "Informativo" };

const DESTAQUES = [
  "ebitda",
  "margemEbitda",
  "ncg",
  "saldoTesouraria",
  "fleuriet",
  "liquidezCorrente",
  "dividaLiquidaEbitda",
  "coberturaJuros",
  "endividamentoGeral",
  "custoDivida",
  "cicloFinanceiro",
  "aliquotaIr",
];

const LEITURAS = ["fleuriet", "ncg", "saldoTesouraria", "dividaLiquidaEbitda", "aliquotaIr", "custoDivida"];

const EVOLUCAO = [
  "ncg",
  "saldoTesouraria",
  "liquidezCorrente",
  "liquidezSeca",
  "dividaLiquidaEbitda",
  "endividamentoGeral",
  "margemBruta",
  "margemEbitda",
  "margemLiquida",
  "cicloFinanceiro",
  "custoDivida",
];

const ind = (a: Analise, k: string) => a.secoes.flatMap((s) => s.indicadores).find((i) => i.chave === k);
const indicadores = (a: Analise, chaves: string[]) => chaves.map((k) => ind(a, k)).filter((i): i is Indicador => !!i);
const linhaDre = (a: Analise, rotulo: string) => a.dre.find((l) => l.rotulo === rotulo)?.valor ?? 0;

export default async function ApresentacaoCreditoPage() {
  const registros = await listarRegistrosCredito();
  const analises = registros.map((r) => analisar(r, registros)).slice(-12);
  const atual = analises[analises.length - 1];

  return (
    <div className="flex flex-col">
      <Topbar title="Apresentação" subtitle="Análise de Crédito - visão executiva" />
      <div className="space-y-6 p-6">
        {!atual ? (
          <p className="text-sm text-muted">Nenhum mês incluído na Análise de Crédito.</p>
        ) : (
          <>
            <CabecalhoApresentacao
              titulo={`Análise de Crédito - ${rotuloCompetencia(atual.registro.competencia)}`}
              referencia={`${atual.registro.empresa} · Balanço de ${atual.registro.dataBalanco.split("-").reverse().join("/")} · DRE do ${atual.periodo.descricao}`}
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {[
                { t: "Receita líquida", v: formatar(linhaDre(atual, "Receita Líquida"), "moeda") },
                { t: "Lucro líquido", v: formatar(linhaDre(atual, "Lucro Líquido do Período"), "moeda") },
              ].map((c) => (
                <Card key={c.t}>
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs text-muted">{c.t}</p>
                    <p className="text-xl font-semibold">{c.v}</p>
                  </CardContent>
                </Card>
              ))}
              {indicadores(atual, DESTAQUES).map((i) => (
                <Card key={i.chave}>
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs text-muted">{i.titulo}</p>
                    <p className="text-xl font-semibold">{i.valorTexto ?? formatar(i.valor, i.formato)}</p>
                    <Badge variant={corTom[i.tom]}>{rotuloTom[i.tom]}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Leitura do analista</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-5 text-sm">
                  {indicadores(atual, LEITURAS).map((i) => (
                    <li key={i.chave}>
                      <span className="font-medium">{i.titulo}:</span> {i.leitura}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {analises.length > 1 && (
              <div className="grid gap-4 xl:grid-cols-2">
                <BarChartCard
                  title="Resultado por mês"
                  data={analises.map((a) => ({
                    mes: rotuloCompetencia(a.registro.competencia),
                    ebitda: ind(a, "ebitda")?.valor ?? 0,
                    lucro: linhaDre(a, "Lucro Líquido do Período"),
                  }))}
                  xKey="mes"
                  series={[
                    { key: "ebitda", name: "EBITDA", color: "#1c8388" },
                    { key: "lucro", name: "Lucro líquido", color: "#12b76a" },
                  ]}
                  valueFormat="currency"
                />
                <LineChartCard
                  title="Capital de giro por mês"
                  data={analises.map((a) => ({
                    mes: rotuloCompetencia(a.registro.competencia),
                    ncg: ind(a, "ncg")?.valor ?? 0,
                    ccl: ind(a, "ccl")?.valor ?? 0,
                    tesouraria: ind(a, "saldoTesouraria")?.valor ?? 0,
                  }))}
                  xKey="mes"
                  series={[
                    { key: "ncg", name: "NCG", color: "#d68c2b" },
                    { key: "ccl", name: "CCL", color: "#1c8388" },
                    { key: "tesouraria", name: "Saldo de tesouraria", color: "#f04438" },
                  ]}
                  valueFormat="currency"
                />
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Evolução dos indicadores</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      <th className="py-2 text-left font-medium">Indicador</th>
                      {analises.map((a) => (
                        <th key={a.registro.competencia} className="py-2 pl-4 text-right font-medium">
                          {rotuloCompetencia(a.registro.competencia)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {indicadores(atual, EVOLUCAO).map((ref) => (
                      <tr key={ref.chave} className="border-b border-border/50">
                        <td className="py-1.5">{ref.titulo}</td>
                        {analises.map((a) => {
                          const i = ind(a, ref.chave);
                          return (
                            <td key={a.registro.competencia} className="py-1.5 pl-4 text-right tabular-nums">
                              {i ? formatar(i.valor, i.formato) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
