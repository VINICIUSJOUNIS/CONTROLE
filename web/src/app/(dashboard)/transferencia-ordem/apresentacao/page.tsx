import { Topbar } from "@/components/layout/topbar";
import { CabecalhoApresentacao, hojeExtenso } from "@/components/apresentacao/cabecalho";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBanksWithTransferChannel, getTransferenciasOrdem } from "@/lib/data";
import { formatCurrency, formatDate, formatMonthLabel } from "@/lib/format";

// Moeda gravada como codigo ISO (USD, EUR...); valores de moedas diferentes nunca sao somados.
const moedaFmt = (valor: number, moeda: string) => {
  try {
    return formatCurrency(valor, moeda);
  } catch {
    return `${moeda} ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
};

export default async function ApresentacaoTransferenciaOrdemPage() {
  const [banks, transferencias] = await Promise.all([getBanksWithTransferChannel(), getTransferenciasOrdem()]);
  const nomeBanco = new Map(banks.map((b) => [b.id, b.name]));
  const ano = new Date().getFullYear().toString();
  const doAno = transferencias.filter((t) => t.data.startsWith(ano));

  const porMoeda = Object.entries(
    doAno.reduce<Record<string, { qtd: number; total: number }>>((acc, t) => {
      acc[t.moeda] ??= { qtd: 0, total: 0 };
      acc[t.moeda].qtd += 1;
      acc[t.moeda].total += t.valor;
      return acc;
    }, {})
  ).sort((a, b) => b[1].total - a[1].total);
  const moedaPrincipal = porMoeda[0]?.[0];
  const tarifas = doAno.reduce((s, t) => s + (t.valorTarifa ?? 0), 0);

  const porMes = Array.from({ length: 12 }, (_, i) => {
    const mes = `${ano}-${String(i + 1).padStart(2, "0")}`;
    const lista = doAno.filter((t) => t.data.startsWith(mes) && t.moeda === moedaPrincipal);
    return { mes: formatMonthLabel(mes), valor: lista.reduce((s, t) => s + t.valor, 0), ordens: lista.length };
  });

  const porBanco = Object.values(
    doAno.reduce<Record<string, { banco: string; qtd: number; valores: Record<string, number> }>>((acc, t) => {
      const banco = (t.bankId && nomeBanco.get(t.bankId)) || t.bancoDestino || "Sem banco";
      acc[banco] ??= { banco, qtd: 0, valores: {} };
      acc[banco].qtd += 1;
      acc[banco].valores[t.moeda] = (acc[banco].valores[t.moeda] ?? 0) + t.valor;
      return acc;
    }, {})
  ).sort((a, b) => b.qtd - a.qtd);

  return (
    <div className="flex flex-col">
      <Topbar title="Apresentação" subtitle="Transferência de Ordem - visão executiva" />
      <div className="space-y-6 p-6">
        <CabecalhoApresentacao titulo={`Transferências de Ordem ${ano}`} referencia={`Posição em ${hojeExtenso()}`} />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted">Ordens no ano</p>
              <p className="text-xl font-semibold">{doAno.length}</p>
            </CardContent>
          </Card>
          {porMoeda.slice(0, 2).map(([moeda, v]) => (
            <Card key={moeda}>
              <CardContent className="space-y-1 p-4">
                <p className="text-xs text-muted">Total em {moeda}</p>
                <p className="text-xl font-semibold">{moedaFmt(v.total, moeda)}</p>
                <p className="text-xs text-muted">{v.qtd} ordens</p>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted">Tarifas descontadas</p>
              <p className="text-xl font-semibold">{tarifas ? moedaFmt(tarifas, moedaPrincipal ?? "USD") : "-"}</p>
            </CardContent>
          </Card>
        </div>

        {moedaPrincipal && (
          <BarChartCard
            title={`Valor transferido por mês (${moedaPrincipal})`}
            data={porMes}
            xKey="mes"
            series={[{ key: "valor", name: `Valor (${moedaPrincipal})`, color: "#1c8388" }]}
          />
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Por banco no ano</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <tbody>
                  {porBanco.map((b) => (
                    <tr key={b.banco} className="border-b border-border/50">
                      <td className="py-1.5">{b.banco}</td>
                      <td className="py-1.5 text-right tabular-nums">{b.qtd} ordens</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {Object.entries(b.valores)
                          .map(([m, v]) => moedaFmt(v, m))
                          .join(" + ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Últimas ordens</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-sm">
                <tbody>
                  {transferencias.slice(0, 10).map((t) => (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="py-1.5">{formatDate(t.data)}</td>
                      <td className="py-1.5">{t.numeroOrdem}</td>
                      <td className="py-1.5">{(t.bankId && nomeBanco.get(t.bankId)) || t.bancoDestino}</td>
                      <td className="py-1.5 text-right tabular-nums">{moedaFmt(t.valor, t.moeda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
