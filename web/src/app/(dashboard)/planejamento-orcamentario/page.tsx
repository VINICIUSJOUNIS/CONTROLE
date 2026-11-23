import { Topbar } from "@/components/layout/topbar";
import { PlanejamentoView } from "@/components/planejamento/planejamento-view";
import { getBudgetPlan, getBudgetYears, getHistoricoVendasMensal } from "@/lib/budget-data";
import { MESES_CURTOS, somaJanela } from "@/lib/budget-projecao";
import type { BudgetScenario } from "@/generated/prisma/client";

// Orcamento: indicadores do plano, graficos e despesas por grupo. Historico e
// projecoes, premissas e tributos ficam em paginas proprias do modulo.
export default async function PlanejamentoOrcamentarioPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; cenario?: string }>;
}) {
  const params = await searchParams;
  const years = await getBudgetYears();
  const year = params.year ? Number(params.year) : years[0] ?? new Date().getFullYear();
  const [plan, vendas] = await Promise.all([
    getBudgetPlan(year, params.cenario as BudgetScenario | undefined),
    getHistoricoVendasMensal(),
  ]);
  // Base de comparacao dos cards = ano corrente fechado por estimativa:
  // janeiro ate o ultimo mes fechado = vendas reais; meses que faltam (ex.:
  // nov e dez) = media do mesmo mes nos dois anos anteriores (ex.: 2024 e 2025).
  const u = vendas.ultimoMesFechado;
  const anoAnterior = u
    ? (() => {
        const ano = Number(u.slice(0, 4));
        const ultimo = Number(u.slice(5, 7));
        const mesRef = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
        const real = (m: "INTERNO" | "EXTERNO") => somaJanela(vendas.historico, mesRef(ano, 1), u, m);
        const projetado = (m: "INTERNO" | "EXTERNO") => {
          let sacas = 0;
          let receita = 0;
          for (let mm = ultimo + 1; mm <= 12; mm++) {
            const a1 = somaJanela(vendas.historico, mesRef(ano - 1, mm), mesRef(ano - 1, mm), m);
            const a2 = somaJanela(vendas.historico, mesRef(ano - 2, mm), mesRef(ano - 2, mm), m);
            sacas += (a1.sacas + a2.sacas) / 2;
            receita += (a1.receita + a2.receita) / 2;
          }
          return { sacas, receita };
        };
        const ri = real("INTERNO");
        const re = real("EXTERNO");
        const pi = projetado("INTERNO");
        const pe = projetado("EXTERNO");
        const m = (n: number) => MESES_CURTOS[n - 1].toLowerCase();
        const faltam = ultimo < 12 ? MESES_CURTOS.slice(ultimo).map((x) => x.toLowerCase()).join("/") : "";
        return {
          rotulo:
            `${ano} (${ultimo === 1 ? m(1) : `${m(1)} a ${m(ultimo)}`} realizado` +
            (faltam ? ` + ${faltam} pela média de ${ano - 2}/${ano - 1})` : ")"),
          volume: ri.sacas + re.sacas + pi.sacas + pe.sacas,
          volInt: ri.sacas + pi.sacas,
          volExt: re.sacas + pe.sacas,
          receita: ri.receita + re.receita + pi.receita + pe.receita,
          recInt: ri.receita + pi.receita,
          recExt: re.receita + pe.receita,
          // Partes da base, para a explicacao (lupa) dos cards.
          partes: {
            realizado: `${ultimo === 1 ? m(1) : `${m(1)} a ${m(ultimo)}`}/${String(ano).slice(2)}`,
            projetado: faltam ? `${faltam} (média ${ano - 2}/${ano - 1})` : null,
            realInt: ri,
            realExt: re,
            projInt: pi,
            projExt: pe,
          },
        };
      })()
    : null;

  return (
    <div className="flex flex-col">
      <Topbar title="Orçamento" subtitle="Indicadores do plano, despesas por grupo e acompanhamento Previsto x Realizado" />
      <div className="space-y-6 p-6">
        {plan ? (
          <PlanejamentoView plan={plan} anoAnterior={anoAnterior} />
        ) : (
          <p className="text-center text-muted">Nenhum plano orçamentário cadastrado para {year}.</p>
        )}
      </div>
    </div>
  );
}
