// Comparativo entre periodos da Analise de Credito: meses lado a lado e
// trimestres acumulados. Cada coluna e uma Analise completa (mesmo motor da
// tela do mes - analisar), entao DRE, balanco e indicadores seguem exatamente
// as mesmas formulas; aqui so se escolhe o periodo e se alinham as linhas.
import { CAMPOS_DRE, type Dre } from "./campos";
import {
  analisar,
  depreciacaoDoMes,
  dreDoMes,
  rotuloCompetencia,
  somarDre,
  type Analise,
  type Formato,
  type RegistroCredito,
} from "./calculos";

export type ColunaComparativo = {
  chave: string;
  rotulo: string;
  detalhe: string;
  parcial: boolean;
  href: string | null;
  analise: Analise;
};

export type LinhaComparativo = {
  grupo: string;
  rotulo: string;
  formato: Formato;
  destaque: boolean;
  valores: (number | null)[];
};

// ------------------------------------------------------------------- Meses

export function colunasMensais(registros: RegistroCredito[]): ColunaComparativo[] {
  return registros.map((r) => {
    const analise = analisar(r, registros);
    return {
      chave: r.competencia,
      rotulo: rotuloCompetencia(r.competencia),
      detalhe: analise.periodo.mensal ? "mês isolado" : analise.periodo.descricao,
      parcial: !analise.periodo.mensal,
      href: `/credito/${r.competencia}`,
      analise,
    };
  });
}

// --------------------------------------------------------------- Trimestres

const trimestreDe = (comp: string) => `${comp.slice(0, 4)}-T${Math.floor((Number(comp.slice(5, 7)) - 1) / 3) + 1}`;
const mesesDoTrimestre = (tri: string) => {
  const ano = tri.slice(0, 4);
  const t = Number(tri.slice(6));
  return [1, 2, 3].map((i) => `${ano}-${String((t - 1) * 3 + i).padStart(2, "0")}`);
};
const trimestreAnterior = (tri: string) => {
  const ano = Number(tri.slice(0, 4));
  const t = Number(tri.slice(6));
  return t === 1 ? `${ano - 1}-T4` : `${ano}-T${t - 1}`;
};
const mesAnterior = (comp: string) => {
  const [a, m] = comp.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
};
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeMes = (comp: string) => MESES[Number(comp.slice(5, 7)) - 1];

type Acumulado = { meses: string[]; dre: Dre; depreciacao: number | null };

// DRE do trimestre: soma da DRE isolada de cada mes cadastrado do trimestre.
// Mes cuja DRE isolada nao da para obter (acumulada sem o mes anterior) fica fora.
function acumularTrimestre(tri: string, porComp: Map<string, RegistroCredito>): Acumulado | null {
  const zero = Object.fromEntries(CAMPOS_DRE.map((c) => [c.chave, 0])) as Dre;
  let dre = zero;
  let depreciacao: number | null = 0;
  const meses: string[] = [];
  for (const comp of mesesDoTrimestre(tri)) {
    const m = porComp.has(comp) ? dreDoMes(comp, porComp) : null;
    if (!m) continue;
    dre = somarDre(dre, m);
    meses.push(comp);
    const dep = depreciacaoDoMes(comp, porComp);
    depreciacao = depreciacao === null || dep === null ? null : depreciacao + dep;
  }
  return meses.length ? { meses, dre, depreciacao } : null;
}

export function colunasTrimestrais(registros: RegistroCredito[]): ColunaComparativo[] {
  const porComp = new Map(registros.map((r) => [r.competencia, r]));
  const trimestres = Array.from(new Set(registros.map((r) => trimestreDe(r.competencia)))).sort();

  return trimestres.flatMap((tri) => {
    const acc = acumularTrimestre(tri, porComp);
    if (!acc) return [];
    const ultimo = porComp.get(acc.meses[acc.meses.length - 1])!;

    // Balanco de comparacao: fim do mes anterior ao primeiro mes usado (registro
    // salvo ou a coluna de saldo anterior do PDF desse primeiro mes).
    const antesDoInicio = porComp.get(mesAnterior(acc.meses[0]));
    const balancoAnterior = antesDoInicio?.balanco ?? porComp.get(acc.meses[0])?.balancoAnterior ?? null;
    const fonteAnterior = antesDoInicio
      ? `balanço de ${rotuloCompetencia(antesDoInicio.competencia)}`
      : balancoAnterior
        ? `saldo anterior do PDF de ${rotuloCompetencia(acc.meses[0])}`
        : "sem balanço anterior";
    const ant = acumularTrimestre(trimestreAnterior(tri), porComp);

    const [ano, t] = [tri.slice(0, 4), tri.slice(6)];
    const parcial = acc.meses.length < 3;
    const intervalo = `${nomeMes(acc.meses[0])} a ${nomeMes(acc.meses[acc.meses.length - 1])}`;
    const analise = analisar(ultimo, registros, {
      descricao: `${t}º trimestre de ${ano} (${acc.meses.length === 1 ? nomeMes(acc.meses[0]) : intervalo})`,
      meses: acc.meses.length,
      dre: acc.dre,
      balancoAnterior,
      fonteAnterior,
      dreAnterior: ant?.dre ?? null,
      depreciacaoAnterior: ant?.depreciacao ?? null,
    });
    return [
      {
        chave: tri,
        rotulo: `${t}º tri/${ano}`,
        detalhe: parcial ? `parcial: ${acc.meses.map(nomeMes).join(", ")}` : intervalo,
        parcial,
        href: null,
        analise,
      },
    ];
  });
}

// ---------------------------------------------------------------- Linhas

const LINHAS_DRE = [
  "Receita Operacional Bruta",
  "(-) Deduções da Receita",
  "Receita Líquida",
  "(-) Custo das Mercadorias Vendidas",
  "Lucro Bruto",
  "(-) Despesas com Vendas",
  "(-) Despesas Gerais e Administrativas",
  "(-) Despesas Tributárias",
  "(-) Depreciação e Amortização (destacada)",
  "(+) Outras Receitas Operacionais",
  "(-) Outras Despesas Operacionais",
  "(+/-) Equivalência Patrimonial",
  "EBIT (Lucro Antes do Resultado Financeiro)",
  "(+) Receitas Financeiras",
  "(-) Despesas Financeiras",
  "(+/-) Variação Cambial e Monetária Líquida",
  "Resultado Financeiro",
  "(+/-) Resultado Não Operacional",
  "Resultado Antes do IR e CSLL",
  "(-) IRPJ e CSLL",
  "(-) Participações",
  "Lucro Líquido do Período",
  "EBITDA ajustado",
];
const DESTAQUES_DRE = new Set(["Receita Líquida", "Lucro Bruto", "EBIT (Lucro Antes do Resultado Financeiro)", "Lucro Líquido do Período", "EBITDA ajustado"]);

const LINHAS_BALANCO: { rotulo: string; lado: "ativo" | "passivo" }[] = [
  { rotulo: "Ativo Circulante", lado: "ativo" },
  { rotulo: "Ativo Não Circulante", lado: "ativo" },
  { rotulo: "Total do Ativo", lado: "ativo" },
  { rotulo: "Passivo Circulante", lado: "passivo" },
  { rotulo: "Passivo Não Circulante", lado: "passivo" },
  { rotulo: "Patrimônio Líquido", lado: "passivo" },
];

const INDICADORES: { grupo: string; chaves: string[] }[] = [
  { grupo: "Capital de giro", chaves: ["ncg", "ccl", "saldoTesouraria", "pmr", "pme", "pmp", "cicloFinanceiro"] },
  { grupo: "Liquidez", chaves: ["liquidezCorrente", "liquidezSeca", "liquidezImediata", "liquidezGeral"] },
  { grupo: "Endividamento", chaves: ["dividaLiquidaEbitda", "coberturaJuros", "dividaLiquidaPl", "endividamentoGeral"] },
  { grupo: "Rentabilidade", chaves: ["margemBruta", "margemEbitda", "margemLiquida", "roe", "roa"] },
];

export function linhasComparativo(colunas: ColunaComparativo[]): LinhaComparativo[] {
  const linhas: LinhaComparativo[] = [];

  for (const rotulo of LINHAS_DRE) {
    const valores = colunas.map((c) => c.analise.dre.find((l) => (rotulo === "EBITDA ajustado" ? l.rotulo.startsWith(rotulo) : l.rotulo === rotulo))?.valor ?? null);
    const destaque = DESTAQUES_DRE.has(rotulo);
    if (!destaque && valores.every((v) => !v)) continue;
    linhas.push({ grupo: "DRE", rotulo, formato: "moeda", destaque, valores });
  }

  for (const { rotulo, lado } of LINHAS_BALANCO) {
    linhas.push({
      grupo: "Balanço (fim do período)",
      rotulo,
      formato: "moeda",
      destaque: rotulo.startsWith("Total") || rotulo === "Patrimônio Líquido",
      valores: colunas.map((c) => c.analise[lado].find((l) => l.rotulo === rotulo)?.valor ?? null),
    });
  }

  for (const { grupo, chaves } of INDICADORES) {
    for (const chave of chaves) {
      const inds = colunas.map((c) => c.analise.secoes.flatMap((s) => s.indicadores).find((i) => i.chave === chave));
      const ref = inds.find(Boolean);
      if (!ref) continue;
      linhas.push({ grupo, rotulo: ref.titulo, formato: ref.formato, destaque: false, valores: inds.map((i) => i?.valor ?? null) });
    }
  }
  return linhas;
}
