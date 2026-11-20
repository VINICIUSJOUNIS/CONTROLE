// Projecao de volume (sacas) e receita (R$) do proximo ano para o
// Planejamento Orcamentario, a partir do historico real de vendas menos
// devolucoes (mesma base das telas de Faturamento). Sem dependencia do
// Prisma: seguro para importar no componente client.
//
// Metodologia (exibida na tela):
//  - Base de volume: ultimos 12 meses fechados, por mercado (so dado real, sem
//    extrapolar o restante do ano corrente).
//  - Crescimento: percentual do cenario do plano aplicado sobre a base.
//  - Preco R$/saca: premissa editavel; padrao = preco medio liquido do ultimo
//    trimestre fechado (preco corrente), por mercado.
//  - Sazonalidade: participacao de cada mes do ano no volume dos ultimos 24
//    meses fechados (2 observacoes por mes), por mercado.

export type Mercado = "INTERNO" | "EXTERNO";

export type HistoricoMes = {
  ym: string; // "YYYY-MM"
  internoSacas: number;
  internoReceita: number;
  externoSacas: number;
  externoReceita: number;
};

export type Agregado = { sacas: number; receita: number };

export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Soma "YYYY-MM" + n meses (n pode ser negativo).
export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function somaJanela(hist: HistoricoMes[], de: string, ate: string, mercado: Mercado): Agregado {
  let sacas = 0;
  let receita = 0;
  for (const h of hist) {
    if (h.ym < de || h.ym > ate) continue;
    sacas += mercado === "INTERNO" ? h.internoSacas : h.externoSacas;
    receita += mercado === "INTERNO" ? h.internoReceita : h.externoReceita;
  }
  return { sacas, receita };
}

export function precoMedio(a: Agregado) {
  return a.sacas > 0 ? a.receita / a.sacas : 0;
}

export function variacao(anterior: number, atual: number) {
  return anterior > 0 ? (atual - anterior) / anterior : null;
}

// Participacao de cada mes (1..12) no volume da janela [de, ate]. Mes com
// volume liquido negativo (devolucao maior que venda) conta como zero. Sem
// volume na janela: distribuicao uniforme.
export function sazonalidade(hist: HistoricoMes[], de: string, ate: string, mercado: Mercado) {
  const porMes = Array(12).fill(0) as number[];
  for (const h of hist) {
    if (h.ym < de || h.ym > ate) continue;
    const m = Number(h.ym.slice(5, 7)) - 1;
    porMes[m] += mercado === "INTERNO" ? h.internoSacas : h.externoSacas;
  }
  const pos = porMes.map((v) => Math.max(v, 0));
  const total = pos.reduce((s, v) => s + v, 0);
  return total > 0 ? pos.map((v) => v / total) : Array(12).fill(1 / 12);
}

export type ProjecaoPremissas = {
  crescimento: number; // fracao, ex. 0.05
  precoInterno: number;
  precoExterno: number;
};

export function projetarAno(
  baseInterno: number,
  baseExterno: number,
  sazInterno: number[],
  sazExterno: number[],
  p: ProjecaoPremissas
) {
  const volInterno = baseInterno * (1 + p.crescimento);
  const volExterno = baseExterno * (1 + p.crescimento);
  const meses = MESES_CURTOS.map((label, i) => {
    const interno = volInterno * sazInterno[i];
    const externo = volExterno * sazExterno[i];
    return {
      month: i + 1,
      label,
      internoSacas: interno,
      externoSacas: externo,
      internoReceita: interno * p.precoInterno,
      externoReceita: externo * p.precoExterno,
    };
  });
  const tot = (k: "internoSacas" | "externoSacas" | "internoReceita" | "externoReceita") =>
    meses.reduce((s, m) => s + m[k], 0);
  return {
    meses,
    totais: {
      internoSacas: tot("internoSacas"),
      externoSacas: tot("externoSacas"),
      internoReceita: tot("internoReceita"),
      externoReceita: tot("externoReceita"),
    },
  };
}
