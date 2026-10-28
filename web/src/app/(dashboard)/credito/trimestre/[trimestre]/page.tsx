import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnaliseView } from "@/components/credito/analise-view";
import { cn } from "@/lib/utils";
import { listarRegistrosCredito, listarTrimestresCredito } from "@/lib/credito/dados";
import { formatar, type Analise } from "@/lib/credito/calculos";
import { analisarTrimestrePdf, rotuloTrimestre, somaDosMeses } from "@/lib/credito/comparativo";

export default async function CreditoTrimestrePage({ params }: { params: Promise<{ trimestre: string }> }) {
  const { trimestre } = await params;
  const [trimestres, mensais] = await Promise.all([listarTrimestresCredito(), listarRegistrosCredito()]);
  const registro = trimestres.find((t) => t.trimestre === trimestre);
  if (!registro) notFound();
  const analise = analisarTrimestrePdf(registro, trimestres, mensais);
  const soma = somaDosMeses(trimestre, mensais);

  return (
    <>
      <Topbar title={`Analise de Credito - ${rotuloTrimestre(trimestre)}`} subtitle={`${registro.empresa} · balanço e DRE do trimestre acumulado`} />
      <div className="space-y-4 p-6">
        <Link href="/credito" className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden">
          <ArrowLeft size={14} />
          Todos os meses e trimestres
        </Link>
        {soma && <ConferenciaMeses pdf={analise} soma={soma.analise} detalhe={soma.detalhe} parcial={soma.parcial} />}
        <AnaliseView analise={analise} trimestre />
      </div>
    </>
  );
}

// PDF do trimestre x meses ja incluidos: DRE contra a soma dos meses, balanco
// contra o ultimo mes. Diferenca aponta lancamento retroativo ou mes faltando.
function ConferenciaMeses({ pdf, soma, detalhe, parcial }: { pdf: Analise; soma: Analise; detalhe: string; parcial: boolean }) {
  const dre = (a: Analise, r: string) => a.dre.find((l) => l.rotulo === r)?.valor ?? null;
  const bal = (a: Analise, lado: "ativo" | "passivo", r: string) => a[lado].find((l) => l.rotulo === r)?.valor ?? null;
  const linhas = [
    { rotulo: "Receita Líquida", pdf: dre(pdf, "Receita Líquida"), meses: dre(soma, "Receita Líquida") },
    { rotulo: "Lucro Bruto", pdf: dre(pdf, "Lucro Bruto"), meses: dre(soma, "Lucro Bruto") },
    { rotulo: "Lucro Líquido do Período", pdf: dre(pdf, "Lucro Líquido do Período"), meses: dre(soma, "Lucro Líquido do Período") },
    { rotulo: "Total do Ativo (fim do período)", pdf: bal(pdf, "ativo", "Total do Ativo"), meses: bal(soma, "ativo", "Total do Ativo") },
    { rotulo: "Patrimônio Líquido (fim do período)", pdf: bal(pdf, "passivo", "Patrimônio Líquido"), meses: bal(soma, "passivo", "Patrimônio Líquido") },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conferência com os meses incluídos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 overflow-x-auto">
        <p className={cn("text-xs text-muted", parcial && "text-warning")}>
          Meses: {detalhe}
          {parcial ? " - faltam meses do trimestre, a diferença na DRE é esperada." : "."} Balanço comparado com o último mês incluído.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="py-2 text-left font-medium">Conta</th>
              <th className="py-2 text-right font-medium">PDF do trimestre</th>
              <th className="py-2 text-right font-medium">Meses incluídos</th>
              <th className="py-2 text-right font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const dif = l.pdf !== null && l.meses !== null ? l.pdf - l.meses : null;
              return (
                <tr key={l.rotulo} className="border-b border-border/50">
                  <td className="py-1.5">{l.rotulo}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatar(l.pdf, "moeda")}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatar(l.meses, "moeda")}</td>
                  <td className={cn("py-1.5 text-right tabular-nums", dif !== null && Math.abs(dif) >= 1 ? "text-warning" : "text-success")}>
                    {dif !== null && Math.abs(dif) < 1 ? "bate" : formatar(dif, "moeda")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
