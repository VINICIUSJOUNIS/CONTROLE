"use client";

import { Fragment, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatar, type Analise, type Componente, type Indicador, type Linha, type Tom } from "@/lib/credito/calculos";
import { CAMPO_POR_CHAVE, type Origens } from "@/lib/credito/campos";
import { NOTAS_METODOLOGIA } from "@/lib/credito/notas";

const corTom: Record<Tom, "success" | "warning" | "danger" | "neutral"> = {
  bom: "success",
  atencao: "warning",
  ruim: "danger",
  neutro: "neutral",
};
const rotuloTom: Record<Tom, string> = { bom: "Saudável", atencao: "Atenção", ruim: "Crítico", neutro: "Informativo" };

const fmtData = (iso: string) => iso.split("-").reverse().join("/");

export function AnaliseView({ analise }: { analise: Analise }) {
  const { registro: r, periodo } = analise;
  const todos = analise.secoes.flatMap((s) => s.indicadores);
  const pega = (k: string) => todos.find((i) => i.chave === k);
  const destaques = ["ebitda", "ncg", "saldoTesouraria", "dividaLiquidaEbitda", "liquidezCorrente", "margemLiquida"]
    .map(pega)
    .filter((i): i is Indicador => !!i);
  const falhas = analise.conferencias.filter((c) => !c.ok);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{r.empresa}</p>
            <p className="text-muted">
              CNPJ {r.cnpj} · Balanço em {fmtData(r.dataBalanco)} · DRE {r.dreTipo === "mensal" ? "do mês" : "acumulada no ano"}
              {r.dreInicio ? ` (${fmtData(r.dreInicio)} a ${fmtData(r.dreFim)})` : ""}
            </p>
            <p className="text-xs text-muted">
              Indicadores sobre o {periodo.descricao} ({periodo.dias} dias). Comparação com o mês anterior: {analise.fonteAnterior}.
            </p>
            {r.arquivos.length > 0 && <p className="text-xs text-muted">Arquivos: {r.arquivos.join(", ")}</p>}
          </div>
          <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
            <Printer size={14} />
            Imprimir / PDF
          </Button>
        </CardContent>
      </Card>

      {falhas.length > 0 && (
        <Card className="border-warning">
          <CardContent className="flex gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} />
            <div>
              <p className="font-medium">Conferências com divergência</p>
              <ul className="mt-1 list-disc pl-5 text-muted">
                {falhas.map((f) => (
                  <li key={f.titulo}>
                    {f.titulo}: {f.detalhe}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {destaques.map((i) => (
          <Card key={i.chave}>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted">{i.titulo}</p>
              <p className="text-lg font-semibold">{i.valorTexto ?? formatar(i.valor, i.formato)}</p>
              <Badge variant={corTom[i.tom]}>{rotuloTom[i.tom]}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="indicadores">
        <TabsList className="flex-wrap print:hidden">
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="balanco">Balanço</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="conferencia">Conferência e Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores">
          {analise.secoes.map((s) => (
            <section key={s.titulo} className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{s.titulo}</h2>
                <p className="text-xs text-muted">{s.descricao}</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {s.indicadores.map((i) => (
                  <IndicadorCard key={i.chave} ind={i} origens={r.origens} />
                ))}
              </div>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="balanco">
          <div className="grid gap-4 xl:grid-cols-2">
            <TabelaLinhas titulo="Ativo" linhas={analise.ativo} origens={r.origens} comAnterior={analise.temAnterior} rotuloAv="AV" />
            <TabelaLinhas titulo="Passivo e Patrimônio Líquido" linhas={analise.passivo} origens={r.origens} comAnterior={analise.temAnterior} rotuloAv="AV" />
          </div>
          <p className="text-xs text-muted">
            AV = participação no ativo total. AH = variação sobre o mês anterior. Clique numa conta para ver de quais contas do PDF ela foi tirada.
          </p>
        </TabsContent>

        <TabsContent value="dre">
          <TabelaLinhas
            titulo={`Demonstração do Resultado - ${periodo.descricao}`}
            linhas={analise.dre}
            origens={periodo.mensal && r.dreTipo === "acumulado" ? {} : r.origens}
            comAnterior={analise.dre.some((l) => l.anterior !== null)}
            rotuloAv="% RL"
          />
          <p className="text-xs text-muted">% RL = participação na receita líquida. AH = variação sobre o mês anterior cadastrado.</p>
        </TabsContent>

        <TabsContent value="fluxo">
          {analise.dfc ? (
            <>
              <TabelaLinhas titulo="Demonstração dos Fluxos de Caixa (método indireto) - mês" linhas={analise.dfc} origens={{}} comAnterior={false} rotuloAv="" />
              <p className="text-xs text-muted">
                Monta o caixa do mês a partir do EBITDA e das variações de cada conta entre o balanço anterior e o atual. O caixa final
                calculado tem que bater com o caixa + aplicações do balanço.
              </p>
            </>
          ) : (
            <Card>
              <CardContent className="p-5 text-sm text-muted">
                O fluxo de caixa mensal precisa do balanço do mês anterior e da DRE isolada do mês.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conferencia">
          <Card>
            <CardHeader>
              <CardTitle>Conferências automáticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {analise.conferencias.map((c) => (
                <div key={c.titulo} className="flex gap-2">
                  {c.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />}
                  <div>
                    <p className="font-medium">{c.titulo}</p>
                    <p className="text-muted">{c.detalhe}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          {r.observacoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Observações da leitura dos PDFs</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {r.observacoes.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Correções em relação à planilha &quot;Análise de Balanço para Crédito&quot;</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {NOTAS_METODOLOGIA.map((n) => (
                <div key={n.titulo}>
                  <p className="font-medium">{n.titulo}</p>
                  <p className="text-muted">
                    <span className="font-medium">Planilha:</span> {n.planilha}
                  </p>
                  <p className="text-muted">
                    <span className="font-medium">Sistema:</span> {n.sistema}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IndicadorCard({ ind, origens }: { ind: Indicador; origens: Origens }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Card className={cn("border-l-4", ind.tom === "bom" && "border-l-success", ind.tom === "atencao" && "border-l-warning", ind.tom === "ruim" && "border-l-danger")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{ind.titulo}</p>
            {ind.anterior !== null && ind.formato !== "texto" && (
              <p className="text-xs text-muted">Mês anterior: {formatar(ind.anterior, ind.formato)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{ind.valorTexto ?? formatar(ind.valor, ind.formato)}</p>
            <Badge variant={corTom[ind.tom]}>{rotuloTom[ind.tom]}</Badge>
          </div>
        </div>
        <p className="text-sm">{ind.leitura}</p>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="flex items-center gap-1 text-xs font-medium text-primary print:hidden"
        >
          {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          O que é e de onde vêm os números
        </button>
        <div className={cn("space-y-2 border-t border-border pt-3 text-sm", !aberto && "hidden print:block")}>
          <p className="text-muted">{ind.oQueE}</p>
          <p className="rounded-md bg-border/30 px-2 py-1 font-mono text-xs">{ind.formula}</p>
          <table className="w-full text-xs">
            <tbody>
              {ind.componentes.map((c, idx) => (
                <ComponenteLinha key={idx} c={c} origens={origens} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ComponenteLinha({ c, origens }: { c: Componente; origens: Origens }) {
  const contas = (c.campos ?? []).flatMap((k) => (origens[k] ?? []).map((o) => ({ ...o, campo: k })));
  const total = c.rotulo.startsWith("=");
  return (
    <>
      <tr className={cn("border-b border-border/50", total && "font-semibold")}>
        <td className="w-4 py-1 text-muted">{c.sinal}</td>
        <td className="py-1">{c.rotulo}</td>
        <td className="py-1 text-right tabular-nums">
          {c.formato === "texto" ? c.valor : formatar(c.valor, (c.formato as "moeda" | "pct" | "dias" | "vezes") ?? "moeda")}
        </td>
      </tr>
      {contas.map((o, i) => (
        <tr key={i} className="text-muted">
          <td />
          <td className="py-0.5 pl-3">
            {o.codigo && <span className="font-mono">{o.codigo} </span>}
            {o.descricao}
          </td>
          <td className="py-0.5 text-right tabular-nums">{formatar(o.valor, "moeda")}</td>
        </tr>
      ))}
    </>
  );
}

function TabelaLinhas({
  titulo,
  linhas,
  origens,
  comAnterior,
  rotuloAv,
}: {
  titulo: string;
  linhas: Linha[];
  origens: Origens;
  comAnterior: boolean;
  rotuloAv: string;
}) {
  const [aberta, setAberta] = useState<number | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="py-2 text-left font-medium">Conta</th>
              <th className="py-2 text-right font-medium">Valor</th>
              {rotuloAv && <th className="py-2 text-right font-medium">{rotuloAv}</th>}
              {comAnterior && <th className="py-2 text-right font-medium">Mês anterior</th>}
              {comAnterior && <th className="py-2 text-right font-medium">AH</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, idx) => {
              const contas = (l.campos ?? []).flatMap((k) => origens[k] ?? []);
              const clicavel = contas.length > 0;
              return (
                <Fragment key={idx}>
                  <tr
                    onClick={clicavel ? () => setAberta(aberta === idx ? null : idx) : undefined}
                    className={cn(
                      "border-b border-border/50",
                      l.nivel === 0 && "bg-border/30 font-semibold",
                      l.nivel === 1 && "font-semibold",
                      clicavel && "cursor-pointer hover:bg-border/20"
                    )}
                  >
                    <td className={cn("py-1.5", l.nivel === 2 && "pl-4")}>
                      {clicavel && (aberta === idx ? <ChevronDown size={12} className="mr-1 inline" /> : <ChevronRight size={12} className="mr-1 inline" />)}
                      {l.rotulo}
                    </td>
                    <td className={cn("py-1.5 text-right tabular-nums", l.valor < 0 && "text-danger")}>{formatar(l.valor, "moeda")}</td>
                    {rotuloAv && <td className="py-1.5 text-right tabular-nums text-muted">{formatar(l.av, "pct")}</td>}
                    {comAnterior && <td className="py-1.5 text-right tabular-nums text-muted">{formatar(l.anterior, "moeda")}</td>}
                    {comAnterior && <td className="py-1.5 text-right tabular-nums text-muted">{formatar(l.ah, "pct")}</td>}
                  </tr>
                  {aberta === idx &&
                    contas.map((o, i) => (
                      <tr key={`o${i}`} className="text-xs text-muted">
                        <td className="py-0.5 pl-8">
                          {o.codigo && <span className="font-mono">{o.codigo} </span>}
                          {o.descricao}
                        </td>
                        <td className="py-0.5 text-right tabular-nums">{formatar(o.valor, "moeda")}</td>
                        <td colSpan={(rotuloAv ? 1 : 0) + (comAnterior ? 2 : 0)} />
                      </tr>
                    ))}
                  {aberta === idx && l.campos?.length === 1 && CAMPO_POR_CHAVE[l.campos[0]] && (
                    <tr className="text-xs text-muted">
                      <td className="py-1 pl-8 italic" colSpan={2 + (rotuloAv ? 1 : 0) + (comAnterior ? 2 : 0)}>
                        Critério: {CAMPO_POR_CHAVE[l.campos[0]].regra}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

