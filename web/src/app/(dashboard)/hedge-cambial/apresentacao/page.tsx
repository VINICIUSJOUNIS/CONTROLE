import { Topbar } from "@/components/layout/topbar";
import { CabecalhoApresentacao, hojeExtenso } from "@/components/apresentacao/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { calcularDashboard, type LinhaDashboard } from "@/lib/hedge-cambial/dashboard";
import { ctxDe, getParametros, getRegistrosPorAba } from "@/lib/hedge-cambial/data";
import { formatarValor } from "@/lib/hedge-cambial/formatar";
import type { Formato } from "@/lib/hedge-cambial/config";

function Bloco({ titulo, linhas, formato, net }: { titulo: string; linhas: LinhaDashboard[]; formato: Formato; net?: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <tbody>
            {linhas.map((l) => (
              <tr key={l.label} className="border-b border-border/50">
                <td className={cn("py-1.5", l.foraDoNet && "text-muted")}>
                  {l.label}
                  {l.foraDoNet ? " (fora do NET)" : ""}
                </td>
                <td className={cn("py-1.5 text-right tabular-nums", (l.valor ?? 0) < 0 && "text-danger")}>
                  {l.valor === null ? "-" : formatarValor(l.valor, formato)}
                </td>
              </tr>
            ))}
            {net !== undefined && (
              <tr className="bg-border/30 text-base font-semibold">
                <td className="py-2">NET</td>
                <td className={cn("py-2 text-right tabular-nums", net < 0 && "text-danger")}>{formatarValor(net, formato)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default async function ApresentacaoHedgePage() {
  const [abas, parametros] = await Promise.all([getRegistrosPorAba(), getParametros()]);
  const dashboard = calcularDashboard(abas, ctxDe(parametros), parametros.posicaoB3);

  const cards = [
    { t: "NET em sacas", v: formatarValor(dashboard.netSacas, "sacas"), neg: dashboard.netSacas < 0 },
    { t: "NET dólar (LONG x SHORT)", v: formatarValor(dashboard.netDolar, "usd"), neg: dashboard.netDolar < 0 },
    { t: "Dólar de referência", v: parametros.dolar === null ? "-" : formatarValor(parametros.dolar, "num4") },
    { t: "NY (cents/lb)", v: parametros.ny === null ? "-" : formatarValor(parametros.ny, "centlb") },
  ];

  return (
    <div className="flex flex-col">
      <Topbar title="Apresentação" subtitle="Hedge - visão executiva" />
      <div className="space-y-6 p-6">
        <CabecalhoApresentacao titulo="Posição de Hedge" referencia={`Posição em ${hojeExtenso()}`} />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.t}>
              <CardContent className="space-y-1 p-4">
                <p className="text-xs text-muted">{c.t}</p>
                <p className={cn("text-2xl font-semibold", c.neg && "text-danger")}>{c.v}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Bloco titulo="Posição em sacas" linhas={dashboard.sacas} formato="sacas" net={dashboard.netSacas} />
          <Bloco titulo="LONG x SHORT dólar (US$)" linhas={dashboard.dolar} formato="usd" net={dashboard.netDolar} />
          <Bloco titulo="Preços médios" linhas={dashboard.precos} formato="num2" />
        </div>
      </div>
    </div>
  );
}
