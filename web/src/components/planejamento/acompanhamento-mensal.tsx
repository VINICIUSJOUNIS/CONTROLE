"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/format";
import { SCENARIO_LABELS, CUSTO_FIXO_GROUPS, CUSTO_VARIAVEL_GROUPS, calcPontoEquilibrio } from "@/lib/budget-constants";
import type { BudgetPlanData } from "@/lib/budget-data";
import { salvarRealizadoMes } from "@/app/(dashboard)/planejamento-orcamentario/actions";

type Plano = NonNullable<BudgetPlanData>;

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const sc = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} sc`;
const TH = "px-3 py-2 text-right font-medium";
const TD = "px-3 py-1.5 text-right tabular-nums";

// Variacao do realizado sobre o previsto. Receita/volume: acima e bom (verde);
// despesa: acima e ruim (vermelho).
function Var({ previsto, realizado, despesa = false }: { previsto: number; realizado: number; despesa?: boolean }) {
  if (!previsto || !realizado) return <span className="text-muted">-</span>;
  const v = ((realizado - previsto) / Math.abs(previsto)) * 100;
  const bom = despesa ? v <= 0 : v >= 0;
  return <span className={bom ? "text-success" : "text-danger"}>{`${v >= 0 ? "+" : ""}${formatPercent(v, 1)}`}</span>;
}

type PE = ReturnType<typeof calcPontoEquilibrio>;

// Ponto de equilibrio em R$: verde se a receita do periodo cobriu, vermelho se
// ficou abaixo; "-" quando nao ha como calcular (sem receita, ou custos
// variaveis >= receita).
function ValorPE({ pe, receita }: { pe: PE; receita: number }) {
  if (pe.valorReais === null) return <span className="text-muted">-</span>;
  return <span className={receita >= pe.valorReais ? "text-success" : "text-danger"}>{formatCurrency(pe.valorReais)}</span>;
}

// Margem de seguranca: quanto a receita pode cair ate o ponto de equilibrio.
const margemSeguranca = (pe: PE, receita: number) =>
  pe.valorReais !== null && receita > 0 ? ((receita - pe.valorReais) / receita) * 100 : null;

function TextoMargem({ v }: { v: number | null }) {
  if (v === null) return <span className="text-muted">-</span>;
  return <span className={v >= 0 ? "text-success" : "text-danger"}>{formatPercent(v, 1)}</span>;
}

const paraTexto = (v: number) => (v ? String(v) : "");
const paraNumero = (t: string) => Number(t.replace(",", ".")) || 0;

// Acompanhamento Mensal do orcamento: quadro do ano (Previsto x Realizado mes
// a mes) e, para o mes escolhido, o lancamento do realizado de volume, receita
// e cada linha de despesa ao lado do previsto. O previsto vem do plano no
// cenario salvo (Premissas) e nao e editado aqui.
export function AcompanhamentoMensal({ plan, mesInicial }: { plan: Plano; mesInicial: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mes, setMes] = useState(mesInicial);
  const [salvo, setSalvo] = useState(false);
  const idx = mes - 1;
  const m = plan.months[idx];
  const linhas = useMemo(() => plan.groups.flatMap((g) => g.lines), [plan.groups]);

  const formDoMes = (i: number) => ({
    volInt: paraTexto(plan.months[i].volumeInternoRealizado),
    volExt: paraTexto(plan.months[i].volumeExternoRealizado),
    receita: paraTexto(plan.months[i].receitaRealizada),
    linhas: Object.fromEntries(linhas.map((l) => [l.id, paraTexto(l.months[i].realizado)])) as Record<string, string>,
  });
  const [form, setForm] = useState(() => formDoMes(idx));

  function trocarMes(novo: number) {
    setMes(novo);
    setForm(formDoMes(novo - 1));
    setSalvo(false);
  }

  function salvar() {
    startTransition(async () => {
      await salvarRealizadoMes(plan.id, mes, {
        volumeInternoRealizado: paraNumero(form.volInt),
        volumeExternoRealizado: paraNumero(form.volExt),
        receitaRealizada: paraNumero(form.receita),
        linhas: linhas.map((l) => ({ lineId: l.id, valorRealizado: paraNumero(form.linhas[l.id] ?? "") })),
      });
      setSalvo(true);
      router.refresh();
    });
  }

  // Realizado em edicao (ainda nao salvo) entra nos totais do mes na tela.
  const despRealForm = linhas.reduce((s, l) => s + paraNumero(form.linhas[l.id] ?? ""), 0);
  const recRealForm = paraNumero(form.receita);

  // Ponto de equilibrio do mes escolhido: previsto do plano; realizado com os
  // valores em edicao (ainda nao salvos), para acompanhar enquanto lanca.
  const somaForm = (gs: string[]) =>
    linhas.filter((l) => gs.includes(l.group)).reduce((s, l) => s + paraNumero(form.linhas[l.id] ?? ""), 0);
  const pePrevMes = m.pontoEquilibrioPrevisto;
  const peRealMes = calcPontoEquilibrio(somaForm(CUSTO_FIXO_GROUPS), somaForm(CUSTO_VARIAVEL_GROUPS), recRealForm);

  // Ponto de equilibrio do ano e acumulado ate o mes: soma dos custos fixos e
  // variaveis dos meses sobre a receita do periodo (nao e a soma dos pontos
  // de equilibrio mensais, que tem % variavel diferente a cada mes).
  const pePeriodo = (meses: Plano["months"]) => {
    const s = meses.reduce(
      (a, x) => ({
        fp: a.fp + x.pontoEquilibrioPrevisto.custosFixos,
        vp: a.vp + x.pontoEquilibrioPrevisto.custosVariaveis,
        rp: a.rp + x.receitaPrevista,
        fr: a.fr + x.pontoEquilibrioRealizado.custosFixos,
        vr: a.vr + x.pontoEquilibrioRealizado.custosVariaveis,
        rr: a.rr + x.receitaRealizada,
      }),
      { fp: 0, vp: 0, rp: 0, fr: 0, vr: 0, rr: 0 }
    );
    return { prev: calcPontoEquilibrio(s.fp, s.vp, s.rp), real: calcPontoEquilibrio(s.fr, s.vr, s.rr) };
  };
  const peAno = pePeriodo(plan.months);
  const peAcum = pePeriodo(plan.months.slice(0, mes));

  // Acumulado do ano ate o mes escolhido (valores salvos).
  const acum = plan.months.slice(0, mes).reduce(
    (a, x) => ({
      recPrev: a.recPrev + x.receitaPrevista,
      recReal: a.recReal + x.receitaRealizada,
      despPrev: a.despPrev + x.despesaPrevista,
      despReal: a.despReal + x.despesaRealizada,
      volPrev: a.volPrev + x.volumeInternoPrevisto + x.volumeExternoPrevisto,
      volReal: a.volReal + x.volumeInternoRealizado + x.volumeExternoRealizado,
    }),
    { recPrev: 0, recReal: 0, despPrev: 0, despReal: 0, volPrev: 0, volReal: 0 }
  );

  const inputCls = "h-8 w-36 text-right";

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-muted">
        Plano {plan.name} · cenário <span className="font-semibold text-foreground">{SCENARIO_LABELS[plan.scenario]}</span> (o salvo em
        Premissas). O previsto vem do plano; aqui você lança e acompanha o realizado de cada mês.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Previsto x Realizado no ano</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full whitespace-nowrap text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-3 py-2 text-left font-medium">Mês</th>
                <th className={TH}>Receita prev.</th>
                <th className={TH}>Receita real.</th>
                <th className={TH}>Var.</th>
                <th className={TH}>Despesa prev.</th>
                <th className={TH}>Despesa real.</th>
                <th className={TH}>Var.</th>
                <th className={TH}>Resultado prev.</th>
                <th className={TH}>Resultado real.</th>
                <th className={TH}>Ponto equil. prev.</th>
                <th className={TH}>Ponto equil. real.</th>
              </tr>
            </thead>
            <tbody>
              {plan.months.map((x, i) => (
                <tr
                  key={x.month}
                  onClick={() => trocarMes(i + 1)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 hover:bg-primary/5",
                    i === idx && "bg-primary/10 font-semibold"
                  )}
                >
                  <td className="px-3 py-1.5">{MESES[i]}</td>
                  <td className={TD}>{formatCurrency(x.receitaPrevista)}</td>
                  <td className={TD}>{x.receitaRealizada ? formatCurrency(x.receitaRealizada) : "-"}</td>
                  <td className={TD}>
                    <Var previsto={x.receitaPrevista} realizado={x.receitaRealizada} />
                  </td>
                  <td className={TD}>{formatCurrency(x.despesaPrevista)}</td>
                  <td className={TD}>{x.despesaRealizada ? formatCurrency(x.despesaRealizada) : "-"}</td>
                  <td className={TD}>
                    <Var previsto={x.despesaPrevista} realizado={x.despesaRealizada} despesa />
                  </td>
                  <td className={TD}>{formatCurrency(x.resultadoPrevisto)}</td>
                  <td className={TD}>{x.receitaRealizada || x.despesaRealizada ? formatCurrency(x.resultadoRealizado) : "-"}</td>
                  <td className={TD}>
                    <ValorPE pe={x.pontoEquilibrioPrevisto} receita={x.receitaPrevista} />
                  </td>
                  <td className={TD}>
                    <ValorPE pe={x.pontoEquilibrioRealizado} receita={x.receitaRealizada} />
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-3 py-2">Ano</td>
                <td className={TD}>{formatCurrency(plan.totais.receitaPrevista)}</td>
                <td className={TD}>{formatCurrency(plan.totais.receitaRealizada)}</td>
                <td className={TD} />
                <td className={TD}>{formatCurrency(plan.totais.despesaPrevista)}</td>
                <td className={TD}>{formatCurrency(plan.totais.despesaRealizada)}</td>
                <td className={TD} />
                <td className={TD}>{formatCurrency(plan.totais.resultadoPrevisto)}</td>
                <td className={TD}>{formatCurrency(plan.totais.resultadoRealizado)}</td>
                <td className={TD}>
                  <ValorPE pe={peAno.prev} receita={plan.totais.receitaPrevista} />
                </td>
                <td className={TD}>
                  <ValorPE pe={peAno.real} receita={plan.totais.receitaRealizada} />
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted">
            Clique em um mês para lançar o realizado. Ponto de equilíbrio = custos fixos ÷ (1 − custos variáveis ÷ receita), com os
            custos e a receita de cada mês; verde quando a receita cobriu, vermelho quando ficou abaixo. Na linha do ano a conta usa
            os totais do ano (não é a soma dos meses).
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {MESES.map((nome, i) => (
          <button
            key={nome}
            type="button"
            onClick={() => trocarMes(i + 1)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              i === idx ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-primary/5"
            )}
          >
            {nome}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Lançamento do realizado · {m.label}</CardTitle>
          <div className="flex items-center gap-3">
            {salvo && <span className="text-[11px] font-medium text-success">Realizado de {m.label} salvo.</span>}
            <Button size="sm" onClick={salvar} disabled={isPending}>
              <Save size={14} />
              {isPending ? "Salvando..." : `Salvar ${m.label}`}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className={TH}>Previsto</th>
                <th className={TH}>Realizado</th>
                <th className={TH}>Diferença</th>
                <th className={TH}>Var.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-primary/5 text-xs font-semibold tracking-wide text-primary">
                <td className="px-3 py-1.5" colSpan={5}>
                  VENDAS
                </td>
              </tr>
              {(
                [
                  ["Volume mercado interno (sc)", m.volumeInternoPrevisto, "volInt", false],
                  ["Volume mercado externo (sc)", m.volumeExternoPrevisto, "volExt", false],
                  ["Receita (R$)", m.receitaPrevista, "receita", true],
                ] as const
              ).map(([rotulo, prev, campo, moeda]) => {
                const real = paraNumero(form[campo]);
                return (
                  <tr key={campo} className="border-b border-border/60">
                    <td className="px-3 py-1.5">{rotulo}</td>
                    <td className={TD}>{moeda ? formatCurrency(prev) : sc(prev)}</td>
                    <td className="px-3 py-1 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        className={inputCls}
                        aria-label={`${rotulo} realizado em ${m.label}`}
                        value={form[campo]}
                        onChange={(e) => {
                          setForm({ ...form, [campo]: e.target.value });
                          setSalvo(false);
                        }}
                      />
                    </td>
                    <td className={TD}>{real ? (moeda ? formatCurrency(real - prev) : sc(real - prev)) : "-"}</td>
                    <td className={TD}>
                      <Var previsto={prev} realizado={real} />
                    </td>
                  </tr>
                );
              })}

              {plan.groups.map((g) => {
                const prevG = g.lines.reduce((s, l) => s + l.months[idx].previsto, 0);
                const realG = g.lines.reduce((s, l) => s + paraNumero(form.linhas[l.id] ?? ""), 0);
                if (g.lines.length === 0) return null;
                return (
                  <Fragment key={g.group}>
                    <tr className="bg-primary/5 text-xs font-semibold tracking-wide text-primary">
                      <td className="px-3 py-1.5">{g.label.toUpperCase()}</td>
                      <td className={TD}>{formatCurrency(prevG)}</td>
                      <td className={TD}>{realG ? formatCurrency(realG) : "-"}</td>
                      <td className={TD}>{realG ? formatCurrency(realG - prevG) : "-"}</td>
                      <td className={TD}>
                        <Var previsto={prevG} realizado={realG} despesa />
                      </td>
                    </tr>
                    {g.lines.map((l) => {
                      const prev = l.months[idx].previsto;
                      const real = paraNumero(form.linhas[l.id] ?? "");
                      return (
                        <tr key={l.id} className="border-b border-border/60">
                          <td className="px-3 py-1.5 pl-6">{l.name}</td>
                          <td className={TD}>{formatCurrency(prev)}</td>
                          <td className="px-3 py-1 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              className={inputCls}
                              aria-label={`${l.name} realizado em ${m.label}`}
                              value={form.linhas[l.id] ?? ""}
                              onChange={(e) => {
                                setForm({ ...form, linhas: { ...form.linhas, [l.id]: e.target.value } });
                                setSalvo(false);
                              }}
                            />
                          </td>
                          <td className={TD}>{real ? formatCurrency(real - prev) : "-"}</td>
                          <td className={TD}>
                            <Var previsto={prev} realizado={real} despesa />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}

              <tr className="border-t-2 border-border font-semibold">
                <td className="px-3 py-2">Total de despesas</td>
                <td className={TD}>{formatCurrency(m.despesaPrevista)}</td>
                <td className={TD}>{despRealForm ? formatCurrency(despRealForm) : "-"}</td>
                <td className={TD}>{despRealForm ? formatCurrency(despRealForm - m.despesaPrevista) : "-"}</td>
                <td className={TD}>
                  <Var previsto={m.despesaPrevista} realizado={despRealForm} despesa />
                </td>
              </tr>
              <tr className="font-semibold">
                <td className="px-3 py-2">Resultado do mês (receita − despesas)</td>
                <td className={TD}>{formatCurrency(m.resultadoPrevisto)}</td>
                <td className={TD}>{recRealForm || despRealForm ? formatCurrency(recRealForm - despRealForm) : "-"}</td>
                <td className={TD}>
                  {recRealForm || despRealForm ? formatCurrency(recRealForm - despRealForm - m.resultadoPrevisto) : "-"}
                </td>
                <td className={TD} />
              </tr>

              <tr className="bg-primary/5 text-xs font-semibold tracking-wide text-primary">
                <td className="px-3 py-1.5" colSpan={5}>
                  PONTO DE EQUILÍBRIO DO MÊS
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="px-3 py-1.5 pl-6">Custos fixos (adm. fixas, pessoal, financiamento)</td>
                <td className={TD}>{formatCurrency(pePrevMes.custosFixos)}</td>
                <td className={TD}>{peRealMes.custosFixos ? formatCurrency(peRealMes.custosFixos) : "-"}</td>
                <td className={TD}>{peRealMes.custosFixos ? formatCurrency(peRealMes.custosFixos - pePrevMes.custosFixos) : "-"}</td>
                <td className={TD}>
                  <Var previsto={pePrevMes.custosFixos} realizado={peRealMes.custosFixos} despesa />
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="px-3 py-1.5 pl-6">Custos variáveis (fornecedor, mercados, adm. variáveis, impostos)</td>
                <td className={TD}>{formatCurrency(pePrevMes.custosVariaveis)}</td>
                <td className={TD}>{peRealMes.custosVariaveis ? formatCurrency(peRealMes.custosVariaveis) : "-"}</td>
                <td className={TD}>
                  {peRealMes.custosVariaveis ? formatCurrency(peRealMes.custosVariaveis - pePrevMes.custosVariaveis) : "-"}
                </td>
                <td className={TD}>
                  <Var previsto={pePrevMes.custosVariaveis} realizado={peRealMes.custosVariaveis} despesa />
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="px-3 py-1.5 pl-6">% custo variável sobre a receita</td>
                <td className={TD}>
                  {pePrevMes.custosVariaveisPercent !== null ? formatPercent(pePrevMes.custosVariaveisPercent * 100, 1) : "-"}
                </td>
                <td className={TD}>
                  {peRealMes.custosVariaveisPercent !== null ? formatPercent(peRealMes.custosVariaveisPercent * 100, 1) : "-"}
                </td>
                <td className={TD} />
                <td className={TD} />
              </tr>
              <tr className="border-b border-border/60 font-semibold">
                <td className="px-3 py-1.5 pl-6">Ponto de equilíbrio (receita mínima do mês)</td>
                <td className={TD}>
                  <ValorPE pe={pePrevMes} receita={m.receitaPrevista} />
                </td>
                <td className={TD}>
                  <ValorPE pe={peRealMes} receita={recRealForm} />
                </td>
                <td className={TD}>
                  {pePrevMes.valorReais !== null && peRealMes.valorReais !== null
                    ? formatCurrency(peRealMes.valorReais - pePrevMes.valorReais)
                    : "-"}
                </td>
                <td className={TD}>
                  {pePrevMes.valorReais !== null && peRealMes.valorReais !== null ? (
                    <Var previsto={pePrevMes.valorReais} realizado={peRealMes.valorReais} despesa />
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 pl-6">Margem de segurança (receita acima do ponto de equilíbrio)</td>
                <td className={TD}>
                  <TextoMargem v={margemSeguranca(pePrevMes, m.receitaPrevista)} />
                </td>
                <td className={TD}>
                  <TextoMargem v={margemSeguranca(peRealMes, recRealForm)} />
                </td>
                <td className={TD} />
                <td className={TD} />
              </tr>
            </tbody>
          </table>
          {(pePrevMes.valorReais === null || (recRealForm > 0 && peRealMes.valorReais === null)) && (
            <p className="mt-2 text-[11px] text-muted">
              &quot;-&quot; no ponto de equilíbrio: sem receita no mês, ou custos variáveis maiores ou iguais à receita (nenhuma receita cobre os
              fixos com essa margem).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acumulado do ano até {m.label}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className={TH}>Previsto</th>
                <th className={TH}>Realizado</th>
                <th className={TH}>Diferença</th>
                <th className={TH}>Var.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="px-3 py-1.5">Volume (sc)</td>
                <td className={TD}>{sc(acum.volPrev)}</td>
                <td className={TD}>{sc(acum.volReal)}</td>
                <td className={TD}>{sc(acum.volReal - acum.volPrev)}</td>
                <td className={TD}>
                  <Var previsto={acum.volPrev} realizado={acum.volReal} />
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="px-3 py-1.5">Receita</td>
                <td className={TD}>{formatCurrency(acum.recPrev)}</td>
                <td className={TD}>{formatCurrency(acum.recReal)}</td>
                <td className={TD}>{formatCurrency(acum.recReal - acum.recPrev)}</td>
                <td className={TD}>
                  <Var previsto={acum.recPrev} realizado={acum.recReal} />
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="px-3 py-1.5">Despesas</td>
                <td className={TD}>{formatCurrency(acum.despPrev)}</td>
                <td className={TD}>{formatCurrency(acum.despReal)}</td>
                <td className={TD}>{formatCurrency(acum.despReal - acum.despPrev)}</td>
                <td className={TD}>
                  <Var previsto={acum.despPrev} realizado={acum.despReal} despesa />
                </td>
              </tr>
              <tr className="font-semibold">
                <td className="px-3 py-1.5">Resultado</td>
                <td className={TD}>{formatCurrency(acum.recPrev - acum.despPrev)}</td>
                <td className={TD}>{formatCurrency(acum.recReal - acum.despReal)}</td>
                <td className={TD}>{formatCurrency(acum.recReal - acum.despReal - (acum.recPrev - acum.despPrev))}</td>
                <td className={TD} />
              </tr>
              <tr className="border-t border-border/60">
                <td className="px-3 py-1.5">Ponto de equilíbrio do período</td>
                <td className={TD}>
                  <ValorPE pe={peAcum.prev} receita={acum.recPrev} />
                </td>
                <td className={TD}>
                  <ValorPE pe={peAcum.real} receita={acum.recReal} />
                </td>
                <td className={TD}>
                  {peAcum.prev.valorReais !== null && peAcum.real.valorReais !== null
                    ? formatCurrency(peAcum.real.valorReais - peAcum.prev.valorReais)
                    : "-"}
                </td>
                <td className={TD} />
              </tr>
              <tr>
                <td className="px-3 py-1.5">Margem de segurança</td>
                <td className={TD}>
                  <TextoMargem v={margemSeguranca(peAcum.prev, acum.recPrev)} />
                </td>
                <td className={TD}>
                  <TextoMargem v={margemSeguranca(peAcum.real, acum.recReal)} />
                </td>
                <td className={TD} />
                <td className={TD} />
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted">Acumulado com os valores já salvos (janeiro até o mês escolhido).</p>
        </CardContent>
      </Card>
    </div>
  );
}
