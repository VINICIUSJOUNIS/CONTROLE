"use client";

import { createContext, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { aplicarProjecaoVolumes, salvarPrecosProjecao } from "@/app/(dashboard)/planejamento-orcamentario/actions";
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

// Classes das tabelas: cabecalho de grupo (Mercado Interno / Externo / Total)
// e divisoria entre grupos - sacas e receita de cada mercado lado a lado.
const TH = "px-2 py-1.5 font-medium text-right";
const TD = "px-2 py-1 text-right";
const GRUPO = "border-l border-border px-2 py-1.5 text-center text-primary";
const SEP = "border-l border-border";

type ProjecaoDados = {
  historico: HistoricoMes[];
  ultimoMesFechado: string;
  crescimentos: Record<BudgetScenarioKey, { interno: number; externo: number }>;
  cenarioInicial: BudgetScenarioKey;
  // Preco R$/saca salvo no plano (Premissas); null = ultimo trimestre fechado.
  precoSalvoI?: number | null;
  precoSalvoE?: number | null;
};

function calcularBase(historico: HistoricoMes[], ultimoMesFechado: string) {
  const ltmDe = addMonths(ultimoMesFechado, -11);
  const ltmAntDe = addMonths(ultimoMesFechado, -23);
  const ltmAntAte = addMonths(ultimoMesFechado, -12);
  const triDe = addMonths(ultimoMesFechado, -2);
  const triI = somaJanela(historico, triDe, ultimoMesFechado, "INTERNO");
  const triE = somaJanela(historico, triDe, ultimoMesFechado, "EXTERNO");
  return {
    ltmI: somaJanela(historico, ltmDe, ultimoMesFechado, "INTERNO"),
    ltmE: somaJanela(historico, ltmDe, ultimoMesFechado, "EXTERNO"),
    antI: somaJanela(historico, ltmAntDe, ltmAntAte, "INTERNO"),
    antE: somaJanela(historico, ltmAntDe, ltmAntAte, "EXTERNO"),
    precoTriI: precoMedio(triI),
    precoTriE: precoMedio(triE),
    sazI: sazonalidade(historico, ltmAntDe, ultimoMesFechado, "INTERNO"),
    sazE: sazonalidade(historico, ltmAntDe, ultimoMesFechado, "EXTERNO"),
  };
}

// Estado da projecao (cenario e precos) compartilhado pela pagina: os
// indicadores ficam no topo (KpisProjecao) e premissas, tabelas e tributos mais
// abaixo (ProjecaoReceita) - os dois leem o mesmo cenario e os mesmos precos.
function useProjecaoEstado({
  historico,
  ultimoMesFechado,
  crescimentos,
  cenarioInicial,
  precoSalvoI = null,
  precoSalvoE = null,
}: ProjecaoDados) {
  const base = useMemo(() => calcularBase(historico, ultimoMesFechado), [historico, ultimoMesFechado]);
  const [cenario, setCenario] = useState<BudgetScenarioKey>(cenarioInicial);
  const [precoI, setPrecoI] = useState(() => (precoSalvoI ?? base.precoTriI).toFixed(2));
  const [precoE, setPrecoE] = useState(() => (precoSalvoE ?? base.precoTriE).toFixed(2));
  const crescI = crescimentos[cenario]?.interno ?? 0;
  const crescE = crescimentos[cenario]?.externo ?? 0;
  const proj = useMemo(
    () =>
      projetarAno(base.ltmI.sacas, base.ltmE.sacas, base.sazI, base.sazE, {
        crescimentoInterno: crescI,
        crescimentoExterno: crescE,
        precoInterno: Number(precoI) || 0,
        precoExterno: Number(precoE) || 0,
      }),
    [base, crescI, crescE, precoI, precoE]
  );
  return {
    historico,
    ultimoMesFechado,
    crescimentos,
    anoProjecao: Number(ultimoMesFechado.slice(0, 4)) + 1,
    base,
    cenario,
    setCenario,
    precoI,
    setPrecoI,
    precoE,
    setPrecoE,
    precoSalvoI,
    precoSalvoE,
    proj,
  };
}

const ProjecaoCtx = createContext<ReturnType<typeof useProjecaoEstado> | null>(null);

function useProjecao() {
  const ctx = useContext(ProjecaoCtx);
  if (!ctx) throw new Error("Use dentro de ProjecaoProvider");
  return ctx;
}

export function ProjecaoProvider({ children, ...dados }: ProjecaoDados & { children: ReactNode }) {
  const estado = useProjecaoEstado(dados);
  return <ProjecaoCtx.Provider value={estado}>{children}</ProjecaoCtx.Provider>;
}

function BotoesCenario() {
  const { cenario, setCenario, crescimentos } = useProjecao();
  return (
    <div className="flex flex-wrap gap-2">
      {SCENARIOS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setCenario(s)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs font-medium",
            cenario === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-primary/5"
          )}
        >
          {SCENARIO_LABELS[s]} (Int {pct(crescimentos[s]?.interno ?? 0)} · Ext {pct(crescimentos[s]?.externo ?? 0)})
        </button>
      ))}
    </div>
  );
}

// Indicadores da projecao do proximo ano, no topo da pagina.
export function KpisProjecao() {
  const { proj, base, cenario, anoProjecao } = useProjecao();
  const t = proj.totais;
  const volTotal = t.internoSacas + t.externoSacas;
  const recTotal = t.internoReceita + t.externoReceita;
  const ltmVol = base.ltmI.sacas + base.ltmE.sacas;
  const ltmRec = base.ltmI.receita + base.ltmE.receita;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Projeção {anoProjecao}</h2>
          <p className="text-[11px] text-muted">
            Variações sobre os últimos 12 meses realizados. Preços R$/saca e metodologia em Premissas.
          </p>
        </div>
        <BotoesCenario />
      </div>
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
    </div>
  );
}

// Historico anual + grafico de volume + projecao mensal (pagina Historico e
// Projecoes).
export function HistoricoProjecoes() {
  const { historico, ultimoMesFechado, anoProjecao, base, cenario, proj } = useProjecao();
  const ltmDe = addMonths(ultimoMesFechado, -11);
  const ltmAntDe = addMonths(ultimoMesFechado, -23);
  const ltmAntAte = addMonths(ultimoMesFechado, -12);

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

  const t = proj.totais;
  const volTotal = t.internoSacas + t.externoSacas;
  const recTotal = t.internoReceita + t.externoReceita;
  const ltmVol = base.ltmI.sacas + base.ltmE.sacas;

  const chartData = [
    ...linhasHistorico
      .filter((l) => !l.parcial && !l.destaque)
      .map((l) => ({ ano: l.label, Interno: Math.round(l.i.sacas), Externo: Math.round(l.e.sacas) })),
    { ano: `12m até ${mesAno(ultimoMesFechado)}`, Interno: Math.round(base.ltmI.sacas), Externo: Math.round(base.ltmE.sacas) },
    { ano: `${anoProjecao} (proj.)`, Interno: Math.round(t.internoSacas), Externo: Math.round(t.externoSacas) },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Vendas menos devoluções (mesma base do Faturamento), dados fechados até {mesAno(ultimoMesFechado)}.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Histórico anual: Mercado Interno x Externo</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full whitespace-nowrap text-xs [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="text-[11px] font-semibold tracking-wider">
                <th rowSpan={2} className="border-b border-border px-2 py-1.5 text-left align-bottom font-medium text-muted">
                  Período
                </th>
                <th colSpan={3} className={GRUPO}>Mercado Interno</th>
                <th colSpan={3} className={GRUPO}>Mercado Externo</th>
                <th colSpan={4} className={GRUPO}>Total</th>
              </tr>
              <tr className="border-b border-border text-[11px] text-muted">
                <th className={cn(TH, SEP)}>Sacas</th>
                <th className={TH}>Receita</th>
                <th className={TH}>R$/saca</th>
                <th className={cn(TH, SEP)}>Sacas</th>
                <th className={TH}>Receita</th>
                <th className={TH}>R$/saca</th>
                <th className={cn(TH, SEP)}>Sacas</th>
                <th className={TH}>Receita</th>
                <th className={TH}>% Externo</th>
                <th className={TH}>Var. Volume</th>
              </tr>
            </thead>
            <tbody>
              {linhasHistorico.map((l) => (
                <tr
                  key={l.label}
                  className={cn("border-b border-border last:border-0", l.destaque && "bg-primary/5 font-medium")}
                >
                  <td className="px-2 py-1 font-medium">{l.label}</td>
                  <td className={cn(TD, SEP)}>{sc(l.i.sacas)}</td>
                  <td className={TD}>{formatCurrency(l.i.receita)}</td>
                  <td className={cn(TD, "text-muted")}>{l.i.sacas > 0 ? formatCurrency(precoMedio(l.i)) : "-"}</td>
                  <td className={cn(TD, SEP)}>{sc(l.e.sacas)}</td>
                  <td className={TD}>{formatCurrency(l.e.receita)}</td>
                  <td className={cn(TD, "text-muted")}>{l.e.sacas > 0 ? formatCurrency(precoMedio(l.e)) : "-"}</td>
                  <td className={cn(TD, SEP, "font-semibold")}>{sc(l.total)}</td>
                  <td className={cn(TD, "font-semibold")}>{formatCurrency(l.receita)}</td>
                  <td className={TD}>{l.total > 0 ? formatPercent((l.e.sacas / l.total) * 100, 1) : "-"}</td>
                  <td className={TD}>{pct(l.varTotal)}</td>
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
              <tr className="text-[11px] font-semibold tracking-wider">
                <th rowSpan={2} className="border-b border-border px-2 py-1.5 text-left align-bottom font-medium text-muted">
                  Mês
                </th>
                <th colSpan={2} className={GRUPO}>Mercado Interno</th>
                <th colSpan={2} className={GRUPO}>Mercado Externo</th>
                <th colSpan={2} className={GRUPO}>Total</th>
              </tr>
              <tr className="border-b border-border text-[11px] text-muted">
                <th className={cn(TH, SEP)}>Sacas</th>
                <th className={TH}>Receita</th>
                <th className={cn(TH, SEP)}>Sacas</th>
                <th className={TH}>Receita</th>
                <th className={cn(TH, SEP)}>Sacas</th>
                <th className={TH}>Receita</th>
              </tr>
            </thead>
            <tbody>
              {proj.meses.map((m) => (
                <tr key={m.month} className="border-b border-border">
                  <td className="px-2 py-1 font-medium">{m.label}</td>
                  <td className={cn(TD, SEP)}>{sc(m.internoSacas)}</td>
                  <td className={TD}>{formatCurrency(m.internoReceita)}</td>
                  <td className={cn(TD, SEP)}>{sc(m.externoSacas)}</td>
                  <td className={TD}>{formatCurrency(m.externoReceita)}</td>
                  <td className={cn(TD, SEP, "font-semibold")}>{sc(m.internoSacas + m.externoSacas)}</td>
                  <td className={cn(TD, "font-semibold")}>{formatCurrency(m.internoReceita + m.externoReceita)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-2 py-1">Total</td>
                <td className={cn(TD, SEP)}>{sc(t.internoSacas)}</td>
                <td className={TD}>{formatCurrency(t.internoReceita)}</td>
                <td className={cn(TD, SEP)}>{sc(t.externoSacas)}</td>
                <td className={TD}>{formatCurrency(t.externoReceita)}</td>
                <td className={cn(TD, SEP)}>{sc(volTotal)}</td>
                <td className={TD}>{formatCurrency(recTotal)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// Premissas da projecao (pagina Premissas): preco R$/saca salvo no plano,
// metodologia e gravacao dos volumes no plano.
export function PremissasProjecao({ planId, planName }: { planId?: string; planName?: string }) {
  const { ultimoMesFechado, anoProjecao, base, precoI, setPrecoI, precoE, setPrecoE, precoSalvoI, precoSalvoE } = useProjecao();
  const router = useRouter();
  const [salvando, startSalvar] = useTransition();
  const [gravando, startGravar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const ltmDe = addMonths(ultimoMesFechado, -11);
  const ltmAntDe = addMonths(ultimoMesFechado, -23);
  const triDe = addMonths(ultimoMesFechado, -2);
  const alterado =
    (Number(precoI) || 0) !== (precoSalvoI ?? Number(base.precoTriI.toFixed(2))) ||
    (Number(precoE) || 0) !== (precoSalvoE ?? Number(base.precoTriE.toFixed(2)));

  function salvarPrecos(padrao = false) {
    if (!planId) return;
    startSalvar(async () => {
      await salvarPrecosProjecao(planId, padrao ? null : Number(precoI) || null, padrao ? null : Number(precoE) || null);
      if (padrao) {
        setPrecoI(base.precoTriI.toFixed(2));
        setPrecoE(base.precoTriE.toFixed(2));
      }
      setAviso(padrao ? "Preços voltaram ao padrão (último trimestre)." : "Preços salvos.");
      router.refresh();
    });
  }

  function gravarNoPlano() {
    if (!planId) return;
    const ok = window.confirm(
      `Gravar os volumes projetados mês a mês em "${planName}"?\n\n` +
        "Substitui o Volume Base e o Volume Externo previstos dos 12 meses do plano. " +
        "Os valores realizados não são alterados. O crescimento do cenário continua sendo aplicado pelo plano."
    );
    if (!ok) return;
    startGravar(async () => {
      await aplicarProjecaoVolumes(planId);
      setAviso("Volumes gravados no plano.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Premissas da projeção {anoProjecao}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Preço R$/saca: Mercado Interno</Label>
            <Input type="number" step="0.01" value={precoI} onChange={(e) => setPrecoI(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted">
              Último trimestre ({mesAno(triDe)} a {mesAno(ultimoMesFechado)}): {formatCurrency(base.precoTriI)} · Últimos 12
              meses: {formatCurrency(precoMedio(base.ltmI))}
              {precoSalvoI !== null && " · valor salvo pelo usuário"}
            </p>
          </div>
          <div>
            <Label>Preço R$/saca: Mercado Externo</Label>
            <Input type="number" step="0.01" value={precoE} onChange={(e) => setPrecoE(e.target.value)} />
            <p className="mt-1 text-[11px] text-muted">
              Último trimestre ({mesAno(triDe)} a {mesAno(ultimoMesFechado)}): {formatCurrency(base.precoTriE)} · Últimos 12
              meses: {formatCurrency(precoMedio(base.ltmE))}
              {precoSalvoE !== null && " · valor salvo pelo usuário"}
            </p>
          </div>
        </div>
        {planId && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => salvarPrecos()} disabled={salvando || !alterado}>
              <Save size={14} />
              {salvando ? "Salvando..." : "Salvar preços"}
            </Button>
            {(precoSalvoI !== null || precoSalvoE !== null) && (
              <Button size="sm" variant="outline" onClick={() => salvarPrecos(true)} disabled={salvando}>
                Voltar ao padrão (último trimestre)
              </Button>
            )}
            <span className="text-[11px] text-muted">Os preços salvos valem em Histórico e Projeções e em Tributos {anoProjecao}.</span>
          </div>
        )}
        <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted">
          <li>
            Volume base: últimos 12 meses fechados ({mesAno(ltmDe)} a {mesAno(ultimoMesFechado)}): Interno {sc(base.ltmI.sacas)} sc,
            Externo {sc(base.ltmE.sacas)} sc, sem extrapolar meses ainda não fechados.
          </li>
          <li>Crescimento de volume: percentual do cenário (Premissas do Plano, acima), igual para os dois mercados.</li>
          <li>Receita: volume projetado × preço R$/saca. Padrão = preço médio líquido do último trimestre fechado (preço corrente).</li>
          <li>
            Distribuição mensal: participação de cada mês no volume dos últimos 24 meses ({mesAno(ltmAntDe)} a {mesAno(ultimoMesFechado)}),
            por mercado.
          </li>
        </ul>
        {planId && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
            <Button size="sm" variant="outline" onClick={gravarNoPlano} disabled={gravando}>
              <Save size={14} />
              {gravando ? "Gravando..." : `Gravar volumes no plano (${planName})`}
            </Button>
            <span className="text-[11px] text-muted">
              Grava o volume base (sem crescimento) e a parcela externa de cada mês; a receita do plano segue a cotação saca × dólar das
              Premissas do Plano.
            </span>
          </div>
        )}
        {aviso && <p className="text-[11px] font-medium text-success">{aviso}</p>}
      </CardContent>
    </Card>
  );
}

// Tributos do ano projetado (pagina Tributos), sobre a receita do cenario.
export function TributosProjecao({
  baseFiscal,
  despesasCreditaveis = 0,
}: {
  baseFiscal?: { de: string; ate: string; cmvSobreReceita: number; lairSobreReceita: number } | null;
  despesasCreditaveis?: number;
}) {
  const { anoProjecao, cenario, proj } = useProjecao();
  const t = proj.totais;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Receita {anoProjecao} do cenário {SCENARIO_LABELS[cenario]}: {formatCurrency(t.internoReceita + t.externoReceita)} (interno{" "}
          {formatCurrency(t.internoReceita)} · externo {formatCurrency(t.externoReceita)}).
        </p>
        <BotoesCenario />
      </div>
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
