"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { aplicarProjecaoVolumes } from "@/app/(dashboard)/planejamento-orcamentario/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SCENARIO_LABELS, type BudgetScenarioKey } from "@/lib/budget-constants";
import {
  addMonths,
  MESES_CURTOS,
  precoMedio,
  projetarAno,
  sazonalidade,
  somaJanela,
  variacao,
  type HistoricoMes,
} from "@/lib/budget-projecao";
import { Package, TrendingUp, Ship, Store, Save } from "lucide-react";
import { ImpostosReforma } from "@/components/planejamento/impostos-reforma";

const sc = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (v: number | null) => (v === null ? "-" : `${v >= 0 ? "+" : ""}${formatPercent(v * 100, 1)}`);
const mesAno = (ym: string) => `${MESES_CURTOS[Number(ym.slice(5, 7)) - 1].toLowerCase()}/${ym.slice(2, 4)}`;

const SCENARIOS: BudgetScenarioKey[] = ["CONSERVADOR", "MODERADO", "OTIMISTA", "MUITO_OTIMISTA"];

export function ProjecaoReceita({
  historico,
  ultimoMesFechado,
  crescimentos,
  cenarioInicial,
  planId,
  planName,
  baseFiscal,
  despesasCreditaveis = 0,
}: {
  historico: HistoricoMes[];
  ultimoMesFechado: string;
  crescimentos: Record<BudgetScenarioKey, number>;
  cenarioInicial: BudgetScenarioKey;
  planId?: string;
  planName?: string;
  baseFiscal?: { de: string; ate: string; cmvSobreReceita: number; lairSobreReceita: number } | null;
  despesasCreditaveis?: number;
}) {
  const router = useRouter();
  const [gravando, startGravar] = useTransition();
  const [gravado, setGravado] = useState(false);

  function gravarNoPlano() {
    if (!planId) return;
    const ok = window.confirm(
      `Gravar os volumes projetados mês a mês em "${planName}"?

` +
        "Substitui o Volume Base e o Volume Externo previstos dos 12 meses do plano. " +
        "Os valores realizados não são alterados. O crescimento do cenário continua sendo aplicado pelo plano."
    );
    if (!ok) return;
    startGravar(async () => {
      await aplicarProjecaoVolumes(planId);
      setGravado(true);
      router.refresh();
    });
  }

  const anoProjecao = Number(ultimoMesFechado.slice(0, 4)) + 1;
  const ltmDe = addMonths(ultimoMesFechado, -11);
  const ltmAntDe = addMonths(ultimoMesFechado, -23);
  const ltmAntAte = addMonths(ultimoMesFechado, -12);
  const triDe = addMonths(ultimoMesFechado, -2);

  const base = useMemo(() => {
    const ltmI = somaJanela(historico, ltmDe, ultimoMesFechado, "INTERNO");
    const ltmE = somaJanela(historico, ltmDe, ultimoMesFechado, "EXTERNO");
    const antI = somaJanela(historico, ltmAntDe, ltmAntAte, "INTERNO");
    const antE = somaJanela(historico, ltmAntDe, ltmAntAte, "EXTERNO");
    const triI = somaJanela(historico, triDe, ultimoMesFechado, "INTERNO");
    const triE = somaJanela(historico, triDe, ultimoMesFechado, "EXTERNO");
    return {
      ltmI,
      ltmE,
      antI,
      antE,
      precoTriI: precoMedio(triI),
      precoTriE: precoMedio(triE),
      sazI: sazonalidade(historico, ltmAntDe, ultimoMesFechado, "INTERNO"),
      sazE: sazonalidade(historico, ltmAntDe, ultimoMesFechado, "EXTERNO"),
    };
  }, [historico, ltmDe, ltmAntDe, ltmAntAte, triDe, ultimoMesFechado]);

  // Historico anual: anos completos + ano corrente parcial + ultimos 12 meses.
  const linhasHistorico = useMemo(() => {
    const anoUltimo = Number(ultimoMesFechado.slice(0, 4));
    const primeiroAno = Number(historico[0]?.ym.slice(0, 4) ?? anoUltimo);
    const linhas: { label: string; de: string; ate: string; parcial?: boolean; destaque?: boolean }[] = [];
    for (let y = primeiroAno; y <= anoUltimo; y++) {
      const ate = y === anoUltimo ? ultimoMesFechado : `${y}-12`;
      const parcial = ate.slice(5, 7) !== "12";
      linhas.push({ label: parcial ? `${y} (jan–${mesAno(ate).slice(0, 3)})` : String(y), de: `${y}-01`, ate, parcial });
    }
    linhas.push({ label: `Últimos 12 meses (${mesAno(ltmDe)} a ${mesAno(ultimoMesFechado)})`, de: ltmDe, ate: ultimoMesFechado, destaque: true });
    let anterior: { i: number; e: number } | null = null;
    return linhas.map((l) => {
      const i = somaJanela(historico, l.de, l.ate, "INTERNO");
      const e = somaJanela(historico, l.de, l.ate, "EXTERNO");
      const total = i.sacas + e.sacas;
      // Variacao de volume so entre anos completos consecutivos.
      const varTotal = !l.parcial && !l.destaque && anterior ? variacao(anterior.i + anterior.e, total) : null;
      if (!l.parcial && !l.destaque) anterior = { i: i.sacas, e: e.sacas };
      return { ...l, i, e, total, receita: i.receita + e.receita, varTotal };
    });
  }, [historico, ultimoMesFechado, ltmDe]);

  const [cenario, setCenario] = useState<BudgetScenarioKey>(cenarioInicial);
  const [precoI, setPrecoI] = useState(() => base.precoTriI.toFixed(2));
  const [precoE, setPrecoE] = useState(() => base.precoTriE.toFixed(2));

  const crescimento = crescimentos[cenario] ?? 0;
  const proj = useMemo(
    () =>
      projetarAno(base.ltmI.sacas, base.ltmE.sacas, base.sazI, base.sazE, {
        crescimento,
        precoInterno: Number(precoI) || 0,
        precoExterno: Number(precoE) || 0,
      }),
    [base, crescimento, precoI, precoE]
  );

  const t = proj.totais;
  const volTotal = t.internoSacas + t.externoSacas;
  const recTotal = t.internoReceita + t.externoReceita;
  const ltmVol = base.ltmI.sacas + base.ltmE.sacas;
  const ltmRec = base.ltmI.receita + base.ltmE.receita;

  const chartData = [
    ...linhasHistorico
      .filter((l) => !l.parcial && !l.destaque)
      .map((l) => ({ ano: l.label, Interno: Math.round(l.i.sacas), Externo: Math.round(l.e.sacas) })),
    { ano: `12m até ${mesAno(ultimoMesFechado)}`, Interno: Math.round(base.ltmI.sacas), Externo: Math.round(base.ltmE.sacas) },
    { ano: `${anoProjecao} (proj.)`, Interno: Math.round(t.internoSacas), Externo: Math.round(t.externoSacas) },
  ];

  const th = "px-2 py-1.5 font-medium text-right";
  const td = "px-2 py-1 text-right";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Histórico e Projeção {anoProjecao}: Volume e Receita</h2>
        <p className="text-xs text-muted">
          Vendas menos devoluções (mesma base do Faturamento), dados fechados até {mesAno(ultimoMesFechado)}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico anual: Mercado Interno x Externo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full whitespace-nowrap text-xs [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted">
                <th className="px-2 py-1.5 text-left font-medium">Período</th>
                <th className={th}>Sacas Interno</th>
                <th className={th}>Sacas Externo</th>
                <th className={th}>Sacas Total</th>
                <th className={th}>% Externo</th>
                <th className={th}>Var. Volume</th>
                <th className={th}>Receita Interna</th>
                <th className={th}>Receita Externa</th>
                <th className={th}>Receita Total</th>
                <th className={th}>R$/saca Int.</th>
                <th className={th}>R$/saca Ext.</th>
              </tr>
            </thead>
            <tbody>
              {linhasHistorico.map((l) => (
                <tr
                  key={l.label}
                  className={cn("border-b border-border last:border-0", l.destaque && "bg-primary/5 font-medium")}
                >
                  <td className="px-2 py-1 font-medium">{l.label}</td>
                  <td className={td}>{sc(l.i.sacas)}</td>
                  <td className={td}>{sc(l.e.sacas)}</td>
                  <td className={td}>{sc(l.total)}</td>
                  <td className={td}>{l.total > 0 ? formatPercent((l.e.sacas / l.total) * 100, 1) : "-"}</td>
                  <td className={td}>{pct(l.varTotal)}</td>
                  <td className={td}>{formatCurrency(l.i.receita)}</td>
                  <td className={td}>{formatCurrency(l.e.receita)}</td>
                  <td className={td}>{formatCurrency(l.receita)}</td>
                  <td className={td}>{l.i.sacas > 0 ? formatCurrency(precoMedio(l.i)) : "-"}</td>
                  <td className={td}>{l.e.sacas > 0 ? formatCurrency(precoMedio(l.e)) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted">
            Crescimento de volume dos últimos 12 meses sobre os 12 anteriores ({mesAno(ltmAntDe)} a {mesAno(ltmAntAte)}):
            Interno {pct(variacao(base.antI.sacas, base.ltmI.sacas))} · Externo{" "}
            {pct(variacao(base.antE.sacas, base.ltmE.sacas))} · Total{" "}
            {pct(variacao(base.antI.sacas + base.antE.sacas, ltmVol))}. Preço médio R$/saca no mesmo comparativo: Interno{" "}
            {pct(variacao(precoMedio(base.antI), precoMedio(base.ltmI)))} · Externo{" "}
            {pct(variacao(precoMedio(base.antE), precoMedio(base.ltmE)))}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Premissas da projeção {anoProjecao}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCenario(s)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium",
                  cenario === s ? "border-primary bg-primary text-white" : "border-border hover:bg-primary/5"
                )}
              >
                {SCENARIO_LABELS[s]} ({pct(crescimentos[s] ?? 0)})
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Preço R$/saca: Mercado Interno</Label>
              <Input type="number" step="0.01" value={precoI} onChange={(e) => setPrecoI(e.target.value)} />
              <p className="mt-1 text-[11px] text-muted">
                Último trimestre ({mesAno(triDe)} a {mesAno(ultimoMesFechado)}): {formatCurrency(base.precoTriI)} · Últimos 12
                meses: {formatCurrency(precoMedio(base.ltmI))}
              </p>
            </div>
            <div>
              <Label>Preço R$/saca: Mercado Externo</Label>
              <Input type="number" step="0.01" value={precoE} onChange={(e) => setPrecoE(e.target.value)} />
              <p className="mt-1 text-[11px] text-muted">
                Último trimestre ({mesAno(triDe)} a {mesAno(ultimoMesFechado)}): {formatCurrency(base.precoTriE)} · Últimos 12
                meses: {formatCurrency(precoMedio(base.ltmE))}
              </p>
            </div>
          </div>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted">
            <li>
              Volume base: últimos 12 meses fechados ({mesAno(ltmDe)} a {mesAno(ultimoMesFechado)}): Interno{" "}
              {sc(base.ltmI.sacas)} sc, Externo {sc(base.ltmE.sacas)} sc, sem extrapolar meses ainda não fechados.
            </li>
            <li>Crescimento de volume: percentual do cenário (definido em Premissas do Plano), igual para os dois mercados.</li>
            <li>Receita: volume projetado × preço R$/saca. Padrão = preço médio líquido do último trimestre fechado (preço corrente).</li>
            <li>
              Distribuição mensal: participação de cada mês no volume dos últimos 24 meses ({mesAno(ltmAntDe)} a{" "}
              {mesAno(ultimoMesFechado)}), por mercado.
            </li>
          </ul>
          {planId && (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <Button size="sm" onClick={gravarNoPlano} disabled={gravando}>
                <Save size={14} />
                {gravando ? "Gravando..." : `Gravar volumes no plano (${planName})`}
              </Button>
              <span className="text-[11px] text-muted">
                {gravado
                  ? "Volumes gravados no plano."
                  : "Grava o volume base (sem crescimento) e a parcela externa de cada mês; a receita do plano segue a cotação saca × dólar das Premissas do Plano."}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Volume ${anoProjecao} (${SCENARIO_LABELS[cenario]})`}
          value={`${sc(volTotal)} sc (${pct(variacao(ltmVol, volTotal))})`}
          icon={Package}
          tone="teal"
        />
        <KpiCard
          label={`Receita ${anoProjecao} (${SCENARIO_LABELS[cenario]})`}
          value={`${formatCurrency(recTotal)} (${pct(variacao(ltmRec, recTotal))})`}
          icon={TrendingUp}
          tone="green"
        />
        <KpiCard
          label="Mercado Interno"
          value={`${sc(t.internoSacas)} sc · ${formatCurrency(t.internoReceita)}`}
          icon={Store}
          tone="soft"
        />
        <KpiCard
          label="Mercado Externo"
          value={`${sc(t.externoSacas)} sc · ${formatCurrency(t.externoReceita)}`}
          icon={Ship}
          tone="teal"
        />
      </div>
      <p className="-mt-2 text-[11px] text-muted">Variações sobre os últimos 12 meses realizados.</p>

      <BarChartCard
        title="Volume anual em sacas: realizado x projeção"
        data={chartData}
        xKey="ano"
        stacked
        series={[
          { key: "Interno", name: "Interno", color: "#1c8388" },
          { key: "Externo", name: "Externo", color: "#12b76a" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Projeção mensal {anoProjecao} ({SCENARIO_LABELS[cenario]})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full whitespace-nowrap text-xs [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted">
                <th className="px-2 py-1.5 text-left font-medium">Mês</th>
                <th className={th}>Sacas Interno</th>
                <th className={th}>Sacas Externo</th>
                <th className={th}>Sacas Total</th>
                <th className={th}>Receita Interna</th>
                <th className={th}>Receita Externa</th>
                <th className={th}>Receita Total</th>
              </tr>
            </thead>
            <tbody>
              {proj.meses.map((m) => (
                <tr key={m.month} className="border-b border-border">
                  <td className="px-2 py-1 font-medium">{m.label}</td>
                  <td className={td}>{sc(m.internoSacas)}</td>
                  <td className={td}>{sc(m.externoSacas)}</td>
                  <td className={td}>{sc(m.internoSacas + m.externoSacas)}</td>
                  <td className={td}>{formatCurrency(m.internoReceita)}</td>
                  <td className={td}>{formatCurrency(m.externoReceita)}</td>
                  <td className={td}>{formatCurrency(m.internoReceita + m.externoReceita)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-2 py-1">Total</td>
                <td className={td}>{sc(t.internoSacas)}</td>
                <td className={td}>{sc(t.externoSacas)}</td>
                <td className={td}>{sc(volTotal)}</td>
                <td className={td}>{formatCurrency(t.internoReceita)}</td>
                <td className={td}>{formatCurrency(t.externoReceita)}</td>
                <td className={td}>{formatCurrency(recTotal)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
      <ImpostosReforma
        ano={anoProjecao}
        receitaInterna={t.internoReceita}
        receitaExterna={t.externoReceita}
        baseFiscal={baseFiscal ?? null}
        despesasCreditaveis={despesasCreditaveis}
      />
    </div>
  );
}
