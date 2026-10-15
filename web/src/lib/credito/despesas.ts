// Analise de Credito - Controle de Despesas Fixas.
//
// Le as contas analiticas de despesa (grupo 4.2) do balancete mensal e separa,
// conta a conta, o que e despesa FIXA (estrutura que existe com ou sem venda)
// do que e variavel (acompanha o volume), nao recorrente ou financeira.
//
// No balancete: saldo anterior = acumulado do ano ate o mes anterior;
// debito - credito = despesa do mes; saldo atual = acumulado do ano.

export const NATUREZAS = ["fixa", "variavel", "nao_recorrente", "financeira"] as const;
export type Natureza = (typeof NATUREZAS)[number];

export const ROTULO_NATUREZA: Record<Natureza, string> = {
  fixa: "Fixa",
  variavel: "Variável",
  nao_recorrente: "Não recorrente",
  financeira: "Financeira",
};

export const CATEGORIAS_FIXAS = [
  "Pessoal e encargos",
  "Ocupação",
  "Utilidades e comunicação",
  "Serviços administrativos e profissionais",
  "Tecnologia",
  "Seguros",
  "Veículos",
  "Materiais e consumo",
  "Tributos e taxas",
  "Despesas gerais",
  "Depreciação e amortização",
] as const;

export type ContaDespesa = {
  codigo: string;
  classificacao: string;
  descricao: string;
  saldoAnterior: number; // acumulado do ano ate o mes anterior
  debito: number;
  credito: number;
  saldoAtual: number; // acumulado do ano
  // Despesa incluida manualmente (nao veio do balancete): natureza e categoria proprias.
  manual?: boolean;
  natureza?: Natureza;
  categoria?: string;
  // Valores originais do PDF quando a conta foi editada na tela.
  original?: { saldoAnterior: number; debito: number; credito: number; saldoAtual: number };
};

// periodica: despesa fixa anual/eventual (IPTU, IPVA, dedetizacao...) - mes zerado e normal.
type Regra = { natureza: Natureza; categoria: string; nota?: string; periodica?: boolean };

// Classificacao de contador senior por conta (plano de contas da Nayme / Eximius).
const REGRAS: Record<string, Regra> = {
  // Despesas com vendas: acompanham o volume vendido/embarcado
  "4.2.1.02.000001": { natureza: "variavel", categoria: "Comissões" },
  "4.2.1.02.000002": { natureza: "variavel", categoria: "Comissões" },
  "4.2.1.02.000003": { natureza: "variavel", categoria: "Comissões" },
  "4.2.1.03.000003": { natureza: "variavel", categoria: "Marketing comercial" },
  "4.2.1.03.000004": { natureza: "nao_recorrente", categoria: "Registro de marcas", nota: "Registro de marca/patente é eventual." },
  "4.2.1.04.000001": { natureza: "variavel", categoria: "Fretes" },
  "4.2.1.04.000004": { natureza: "variavel", categoria: "Fretes" },
  "4.2.1.04.000005": { natureza: "variavel", categoria: "Fretes" },
  "4.2.1.05.000003": { natureza: "variavel", categoria: "Viagens" },
  "4.2.1.05.000004": { natureza: "variavel", categoria: "Viagens" },
  "4.2.1.06.000004": { natureza: "fixa", categoria: "Utilidades e comunicação", periodica: true },
  "4.2.1.06.000008": { natureza: "variavel", categoria: "Despesas de exportação" },
  "4.2.1.06.000009": { natureza: "variavel", categoria: "Armazenagem" },
  // Pessoal: folha e beneficios sao a principal despesa fixa
  "4.2.2.01.000001": { natureza: "fixa", categoria: "Pessoal e encargos" },
  "4.2.2.01.000004": { natureza: "fixa", categoria: "Pessoal e encargos", nota: "Provisão mensal de 13º (competência)." },
  "4.2.2.01.000005": { natureza: "fixa", categoria: "Pessoal e encargos", nota: "Provisão mensal de férias (competência)." },
  "4.2.2.01.000006": { natureza: "fixa", categoria: "Pessoal e encargos" },
  "4.2.2.01.000007": { natureza: "fixa", categoria: "Pessoal e encargos" },
  "4.2.2.01.000008": { natureza: "nao_recorrente", categoria: "Rescisões e indenizações" },
  "4.2.2.01.000009": { natureza: "fixa", categoria: "Pessoal e encargos" },
  "4.2.2.01.000011": { natureza: "nao_recorrente", categoria: "Processos trabalhistas" },
  "4.2.2.01.000012": { natureza: "fixa", categoria: "Pessoal e encargos" },
  "4.2.2.01.000013": { natureza: "fixa", categoria: "Pessoal e encargos" },
  // Ocupacao e tributos sobre a estrutura
  "4.2.2.02.000001": { natureza: "fixa", categoria: "Ocupação" },
  "4.2.2.03.000003": { natureza: "fixa", categoria: "Ocupação", nota: "IPTU: lançado em parcelas ou cota única - comparar pela média.", periodica: true },
  "4.2.2.03.000004": { natureza: "fixa", categoria: "Veículos", nota: "IPVA anual: comparar pela média.", periodica: true },
  "4.2.2.03.000005": { natureza: "fixa", categoria: "Tributos e taxas" },
  // Despesas gerais administrativas
  "4.2.2.04.000001": { natureza: "fixa", categoria: "Utilidades e comunicação" },
  "4.2.2.04.000002": { natureza: "fixa", categoria: "Utilidades e comunicação" },
  "4.2.2.04.000003": { natureza: "fixa", categoria: "Utilidades e comunicação" },
  "4.2.2.04.000004": { natureza: "fixa", categoria: "Utilidades e comunicação" },
  "4.2.2.04.000005": { natureza: "fixa", categoria: "Seguros" },
  "4.2.2.04.000006": { natureza: "fixa", categoria: "Materiais e consumo" },
  "4.2.2.04.000007": { natureza: "fixa", categoria: "Materiais e consumo" },
  "4.2.2.04.000008": { natureza: "fixa", categoria: "Despesas gerais", periodica: true },
  "4.2.2.04.000009": { natureza: "fixa", categoria: "Despesas gerais", nota: "Cartão de crédito é meio de pagamento: pedir à contabilidade o detalhamento por natureza." },
  "4.2.2.04.000010": { natureza: "fixa", categoria: "Depreciação e amortização", nota: "Despesa fixa que não sai do caixa." },
  "4.2.2.04.000014": { natureza: "nao_recorrente", categoria: "Multas" },
  "4.2.2.04.000015": { natureza: "fixa", categoria: "Veículos" },
  "4.2.2.04.000016": { natureza: "fixa", categoria: "Materiais e consumo" },
  "4.2.2.04.000019": { natureza: "nao_recorrente", categoria: "Doações e indedutíveis" },
  "4.2.2.04.000020": { natureza: "nao_recorrente", categoria: "Doações e indedutíveis" },
  "4.2.2.04.000021": { natureza: "nao_recorrente", categoria: "Manutenção e reforma", nota: "Reforma pontual (benfeitorias), não é custo de estrutura recorrente." },
  "4.2.2.04.000022": { natureza: "fixa", categoria: "Utilidades e comunicação" },
  // Servicos tomados de PJ
  "4.2.2.05.000001": { natureza: "variavel", categoria: "Marketing comercial" },
  "4.2.2.05.000005": { natureza: "variavel", categoria: "Manutenção e reparos", nota: "Reparos sob demanda." },
  "4.2.2.05.000006": { natureza: "fixa", categoria: "Serviços administrativos e profissionais", periodica: true },
  "4.2.2.05.000007": { natureza: "fixa", categoria: "Serviços administrativos e profissionais" },
  "4.2.2.05.000008": { natureza: "fixa", categoria: "Serviços administrativos e profissionais" },
  "4.2.2.05.000010": { natureza: "fixa", categoria: "Tecnologia" },
  "4.2.2.05.000011": { natureza: "variavel", categoria: "Logística de documentos" },
  "4.2.2.05.000015": { natureza: "variavel", categoria: "Gráfica" },
  "4.2.2.05.000021": { natureza: "fixa", categoria: "Serviços administrativos e profissionais" },
  "4.2.2.05.000022": { natureza: "fixa", categoria: "Tecnologia" },
  "4.2.2.05.000023": { natureza: "fixa", categoria: "Serviços administrativos e profissionais", periodica: true },
  "4.2.2.05.000027": { natureza: "variavel", categoria: "Cartório", nota: "Reconhecimentos e registros por operação." },
  "4.2.2.05.000028": { natureza: "fixa", categoria: "Veículos", periodica: true },
  "4.2.2.05.000032": { natureza: "fixa", categoria: "Serviços administrativos e profissionais" },
  "4.2.2.08.000005": { natureza: "nao_recorrente", categoria: "Perdas tributárias" },
};

// Contas novas sem regra: classificacao pelo grupo, marcada para revisao.
function regraPorGrupo(cls: string): Regra {
  if (cls.startsWith("4.2.2.06") || cls.startsWith("4.2.2.07")) return { natureza: "financeira", categoria: "Despesas financeiras" };
  if (cls.startsWith("4.2.1")) return { natureza: "variavel", categoria: "Despesas com vendas" };
  if (cls.startsWith("4.2.2.01")) return { natureza: "fixa", categoria: "Pessoal e encargos" };
  if (cls.startsWith("4.2.2.02")) return { natureza: "fixa", categoria: "Ocupação" };
  if (cls.startsWith("4.2.2.03")) return { natureza: "fixa", categoria: "Tributos e taxas" };
  if (cls.startsWith("4.2.2.05")) return { natureza: "fixa", categoria: "Serviços administrativos e profissionais" };
  if (cls.startsWith("4.2.2.08")) return { natureza: "nao_recorrente", categoria: "Outras despesas operacionais" };
  return { natureza: "fixa", categoria: "Despesas gerais" };
}

export type Ajuste = { natureza: Natureza; categoria: string };

export type ContaClassificada = ContaDespesa & {
  natureza: Natureza;
  categoria: string;
  nota?: string;
  origem: "regra" | "automatica" | "ajuste" | "manual";
  valorMes: number;
  mediaAnterior: number | null; // media mensal ate o mes anterior
  alerta?: string;
  periodica: boolean;
};

export function classificar(c: ContaDespesa, meses: number, ajustes: Record<string, Ajuste>): ContaClassificada {
  const ajuste = ajustes[c.classificacao];
  const regra = REGRAS[c.classificacao];
  const manual = c.manual && c.natureza ? { natureza: c.natureza, categoria: c.categoria ?? "Despesas gerais" } : null;
  const base = ajuste ?? manual ?? regra ?? regraPorGrupo(c.classificacao);
  const valorMes = c.debito - c.credito;
  const mediaAnterior = meses > 1 ? c.saldoAnterior / (meses - 1) : null;
  let alerta: string | undefined;
  const periodica = !ajuste && regra?.periodica;
  if (base.natureza === "fixa" && mediaAnterior !== null && mediaAnterior > 0) {
    if (valorMes === 0 && !periodica) alerta = "Sem lançamento no mês, mas tem histórico: verificar se a conta foi provisionada.";
    else if (valorMes > mediaAnterior * 2 && !periodica && valorMes - mediaAnterior > 1000) alerta = "Mais que o dobro da média mensal anterior.";
  }
  return {
    ...c,
    natureza: base.natureza,
    categoria: base.categoria,
    nota: ajuste ? undefined : regra?.nota,
    origem: ajuste ? "ajuste" : manual ? "manual" : regra ? "regra" : "automatica",
    valorMes,
    mediaAnterior,
    alerta,
    periodica: !!periodica,
  };
}

export type ResumoDespesas = {
  meses: number;
  contas: ContaClassificada[];
  porNatureza: Record<Natureza, { mes: number; acumulado: number }>;
  fixasPorCategoria: { categoria: string; mes: number; acumulado: number; media: number; contas: ContaClassificada[] }[];
  fixasMes: number;
  fixasMesCaixa: number; // sem depreciacao
  fixasAcumulado: number;
  fixasMediaMensal: number;
  fixasMediaAnterior: number | null;
};

export function resumir(contas: ContaDespesa[], competencia: string, ajustes: Record<string, Ajuste>): ResumoDespesas {
  const meses = Number(competencia.slice(5, 7));
  const cls = contas.map((c) => classificar(c, meses, ajustes));
  const porNatureza = Object.fromEntries(
    NATUREZAS.map((n) => {
      const l = cls.filter((c) => c.natureza === n);
      return [n, { mes: soma(l, (c) => c.valorMes), acumulado: soma(l, (c) => c.saldoAtual) }];
    })
  ) as ResumoDespesas["porNatureza"];
  const fixas = cls.filter((c) => c.natureza === "fixa");
  const categorias = Array.from(new Set(fixas.map((c) => c.categoria)));
  const fixasPorCategoria = categorias
    .map((categoria) => {
      const l = fixas.filter((c) => c.categoria === categoria).sort((a, b) => b.saldoAtual - a.saldoAtual);
      const acumulado = soma(l, (c) => c.saldoAtual);
      return { categoria, mes: soma(l, (c) => c.valorMes), acumulado, media: acumulado / meses, contas: l };
    })
    .sort((a, b) => b.acumulado - a.acumulado);
  const deprec = soma(
    fixas.filter((c) => c.categoria === "Depreciação e amortização"),
    (c) => c.valorMes
  );
  const fixasAnterior = soma(fixas, (c) => c.saldoAnterior);
  return {
    meses,
    contas: cls,
    porNatureza,
    fixasPorCategoria,
    fixasMes: porNatureza.fixa.mes,
    fixasMesCaixa: porNatureza.fixa.mes - deprec,
    fixasAcumulado: porNatureza.fixa.acumulado,
    fixasMediaMensal: porNatureza.fixa.acumulado / meses,
    fixasMediaAnterior: meses > 1 ? fixasAnterior / (meses - 1) : null,
  };
}

const soma = <T,>(l: T[], f: (x: T) => number) => l.reduce((s, x) => s + f(x), 0);
