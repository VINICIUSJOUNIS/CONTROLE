// Configuracao das abas do modulo Hedge, espelhando a PLANILHA_HEDGE_NAYME.
// Cada aba define:
// - campos: o que e digitado no lancamento diario (gravado em HedgeRegistro.dados);
// - calculados: as colunas com formula na planilha, recalculadas na leitura;
// - colunas: a ordem das colunas na tabela (mesma ordem da planilha).
// As formulas seguem as da planilha, com as correcoes da auditoria anotadas
// em cada uma ("Planilha: ..." indica a formula original).
// Modulo puro (sem acesso a banco) - usado no servidor e no navegador.

import { hedgeCambialAbas } from "@/lib/hedge-cambial-abas";

export type Valor = string | number | null;
export type Dados = Record<string, Valor>;
export type Registro = { id: string; ordem: number; dados: Dados };

export type Ctx = {
  /** Dolar do dia (R$/US$) - parametro do Dashboard Hedge (PTAX). */
  dolar: number | null;
  /** NY atual (c/lb) - parametro do Dashboard Hedge. */
  ny: number | null;
  /** Data de hoje "YYYY-MM-DD". */
  hoje: string;
};

export type Formato = "brl" | "usd" | "sacas" | "lotes" | "num2" | "num4" | "centlb" | "pct" | "data" | "texto";

// Listas cadastraveis usadas em campos de lancamento (gravadas em
// HedgeRegistro com aba "cadastro:<chave>" e dados { nome }).
export const CADASTROS = {
  "corretoras-ndf": { titulo: "Corretoras (Trava NDF)", item: "corretora" },
} as const;

export type Campo = {
  key: string;
  label: string;
  tipo: "data" | "numero" | "texto" | "opcao";
  opcoes?: readonly string[];
  /** Texto livre com sugestoes dos valores ja lancados (clientes, bancos...). */
  sugestoes?: boolean;
  /** Sugestoes fixas somadas as dos valores ja lancados. */
  sugestoesFixas?: readonly string[];
  /** Lista cadastrada (ver CADASTROS): o campo vira uma lista de selecao com opcao de cadastrar. */
  cadastro?: keyof typeof CADASTROS;
  obrigatorio?: boolean;
  formato?: Formato;
  ajuda?: string;
};

export type Calculado = {
  key: string;
  label: string;
  formato: Formato;
  calc: (d: Dados, ctx: Ctx) => number | null;
  ajuda?: string;
};

export type Indicador = { label: string; valor: number | null; formato: Formato; destaque?: boolean; texto?: string };

export type AbaConfig = {
  slug: string;
  label: string;
  descricao: string;
  campos: Campo[];
  calculados: Calculado[];
  colunas: string[];
  /** Colunas somadas na linha de total. */
  totais?: string[];
  /** Campo usado no filtro de status. */
  filtroStatus?: string;
  /** Valores iniciais do formulario de novo lancamento. */
  padrao?: (ctx: Ctx) => Dados;
  /** Validacoes especificas da aba (alem de tipo/obrigatorio). Retorna mensagem de erro. */
  validar?: (d: Dados) => string | null;
  /** Alerta de risco exibido na linha (fica destacada na tabela). */
  alerta?: (d: Dados, ctx: Ctx) => string | null;
  /** Indicadores do topo da tela (calculados sobre todos os registros da aba). */
  indicadores?: (rows: Dados[], ctx: Ctx) => Indicador[];
};

// 1 saca = 60 kg = 132,277 lb. A planilha usa 1,3228 (lb por saca / 100) para
// converter c/lb <-> US$/saca; mantido para os numeros baterem com a planilha.
export const LB_SACA = 1.3228;
// Contrato KC (ICE NY) = 37.500 lb = 283,5 sacas de 60 kg.
export const SACAS_LOTE = 283.5;

export function num(d: Dados, key: string): number | null {
  const v = d[key];
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function n0(d: Dados, key: string): number {
  return num(d, key) ?? 0;
}

export function txt(d: Dados, key: string): string {
  const v = d[key];
  return v === null || v === undefined ? "" : String(v).trim();
}

function soma(rows: Dados[], f: (d: Dados) => number | null): number {
  return rows.reduce((s, d) => s + (f(d) ?? 0), 0);
}

function dataDe(ctx: Ctx): Dados {
  return { data: ctx.hoje };
}

// Diferencial em c/lb a partir de um preco em R$/saca, NY (c/lb) e dolar (R$/US$).
// Planilha: =(E/1,3228/G)-F. Sem dolar ou sem NY o diferencial nao existe
// (a planilha dava #DIV/0! - corrigido para vazio).
function diferencialCentLb(precoBrlSaca: number | null, ny: number | null, dolar: number | null) {
  if (precoBrlSaca === null || ny === null || !dolar) return null;
  return precoBrlSaca / LB_SACA / dolar - ny;
}

// Valor em R$ do diferencial de uma linha (sacas x diferencial convertido para R$/saca).
// Planilha: =H*B (diferencial em c/lb x sacas, sem converter para R$ - unidade errada).
// Corrigido: diferencial x 1,3228 x dolar x sacas = sacas x (preco R$ - NY x 1,3228 x dolar).
function diferencialBrl(sacas: number | null, dif: number | null, dolar: number | null) {
  if (sacas === null || dif === null || !dolar) return null;
  return dif * LB_SACA * dolar * sacas;
}

function diasEntre(de: string, ate: string) {
  const a = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const b = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10));
  return Math.round((b - a) / 86400000);
}

const STATUS_COMPRA_VENDA = ["COMPRA", "VENDA"] as const;

// ---------------------------------------------------------------------------
// TRAVA NDF US$ NAYME
// ---------------------------------------------------------------------------
// Convencao da planilha: VALOR EM US$ com sinal (compra +, venda -);
// LIQUIDACAO PARCIAL com o mesmo sinal; NIVEL USD = taxa contratada;
// NIVEL VENDA = taxa de liquidacao (fixing). As linhas antigas (2023) usavam
// outra convencao (venda em linha separada, com o valor na liquidacao e a
// taxa em NIVEL VENDA) - as formulas abaixo atendem as duas.
function travaTaxa(d: Dados) {
  const f = n0(d, "nivelUsd");
  const g = n0(d, "nivelVenda");
  // Planilha: L=E*F em umas linhas e L=E*G em outras (sem regra). Corrigido:
  // usa a taxa contratada; so cai na taxa de venda quando a contratada esta vazia
  // (linhas antigas de 2023).
  return f !== 0 ? f : g;
}

function travaAjuste(d: Dados) {
  const informado = num(d, "ajusteInformado");
  if (informado !== null) return informado;
  const g = num(d, "nivelVenda");
  if (!g) return 0;
  return n0(d, "liquidacao") * (g - n0(d, "nivelUsd"));
}

// NDF em aberto: status A LIQUIDAR com saldo. (As linhas antigas de 2023/2024
// lancavam compra e venda em linhas separadas e ficam com saldo individual
// mesmo LIQUIDADAS - por isso o filtro e pelo status, nao so pelo saldo.)
export function ndfAberta(d: Dados) {
  return txt(d, "status") === "A LIQUIDAR" && travaSaldo(d) !== 0;
}

// Ajuste previsto no vencimento pelo dolar do dia: saldo x (dolar - taxa
// contratada). Positivo = a Nayme recebe; negativo = a Nayme paga. (Na
// liquidacao vale a PTAX de venda do dia util anterior ao vencimento.)
export function ndfAjustePrevisto(d: Dados, ctx: Ctx): number | null {
  if (!ndfAberta(d) || !ctx.dolar) return null;
  return travaSaldo(d) * (ctx.dolar - travaTaxa(d));
}

export function travaSaldo(d: Dados) {
  return n0(d, "valorUsd") - n0(d, "liquidacao");
}

const travaNdf: AbaConfig = {
  slug: "trava-ndf-us-nayme",
  label: "",
  descricao: "Travas e NDFs de dolar: valor contratado, liquidacoes, saldo em aberto e ajuste (resultado) da liquidacao.",
  campos: [
    { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
    { key: "tipo", label: "COMPRA/VENDA", tipo: "opcao", opcoes: STATUS_COMPRA_VENDA, obrigatorio: true },
    {
      key: "valorUsd",
      label: "VALOR EM US$",
      tipo: "numero",
      formato: "usd",
      obrigatorio: true,
      ajuda: "Compra positivo, venda negativo (como na planilha).",
    },
    {
      key: "liquidacao",
      label: "LIQUIDACAO PARCIAL",
      tipo: "numero",
      formato: "usd",
      ajuda: "Valor ja liquidado, com o mesmo sinal do valor.",
    },
    { key: "nivelUsd", label: "NIVEL USD", tipo: "numero", formato: "num4", obrigatorio: true, ajuda: "Taxa contratada (R$/US$)." },
    { key: "nivelVenda", label: "NIVEL VENDA", tipo: "numero", formato: "num4", ajuda: "Taxa de liquidacao (fixing)." },
    {
      key: "ajusteInformado",
      label: "AJUSTE R$ (informado)",
      tipo: "numero",
      formato: "brl",
      ajuda: "Deixe vazio para calcular: liquidado x (nivel venda - nivel USD). Positivo = ganho.",
    },
    { key: "corretora", label: "CORRETORA", tipo: "texto", obrigatorio: true, cadastro: "corretoras-ndf" },
    { key: "contrato", label: "CONTRATO TRAVA", tipo: "opcao", opcoes: ["NDF", "TRAVA"], obrigatorio: true },
    { key: "status", label: "STATUS", tipo: "opcao", opcoes: ["A LIQUIDAR", "LIQUIDADA"], obrigatorio: true },
    { key: "vencimento", label: "VENCIMENTO", tipo: "data", obrigatorio: true },
    { key: "observacao", label: "OBSERVACAO", tipo: "texto" },
  ],
  calculados: [
    {
      key: "saldoUsd",
      label: "SALDO US$",
      formato: "usd",
      calc: travaSaldo, // Planilha: E=C-D
    },
    {
      key: "ajuste",
      label: "AJUSTE R$ (+ganho / -perda)",
      formato: "brl",
      // Planilha (coluna DESAGIO R$): H=(D*F)-(C*G) na maioria; H9=D*G;
      // H10=(F9-G10)*D10 (linha de cima); H11:H14, H62, H63 digitados. O sinal era
      // positivo = custo, e com liquidacao parcial (D<C) a formula misturava valor
      // total e liquidado. Corrigido para a formula de mercado do ajuste de NDF:
      // nocional liquidado x (taxa de liquidacao - taxa contratada), com o nocional
      // com sinal (venda negativa) - positivo = ganho para a Nayme.
      calc: travaAjuste,
      ajuda: "Liquidado x (nivel venda - nivel USD). Positivo = ganho, negativo = perda.",
    },
    {
      key: "totalBrl",
      label: "TOTAL R$",
      formato: "brl",
      calc: (d) => travaSaldo(d) * travaTaxa(d),
      ajuda: "Saldo US$ x taxa contratada.",
    },
    {
      key: "aReceber",
      label: "A RECEBER R$ (dolar do dia)",
      formato: "brl",
      // Novo: ajuste previsto da NDF em aberto no vencimento, pelo dolar do dia.
      calc: (d, ctx) => {
        const a = ndfAjustePrevisto(d, ctx);
        return a !== null && a > 0 ? a : null;
      },
      ajuda: "NDF em aberto: saldo x (dolar do dia - taxa contratada), quando positivo.",
    },
    {
      key: "aPagar",
      label: "A PAGAR R$ (dolar do dia)",
      formato: "brl",
      calc: (d, ctx) => {
        const a = ndfAjustePrevisto(d, ctx);
        return a !== null && a < 0 ? -a : null;
      },
      ajuda: "NDF em aberto: saldo x (dolar do dia - taxa contratada), quando negativo.",
    },
  ],
  colunas: [
    "data",
    "tipo",
    "valorUsd",
    "liquidacao",
    "saldoUsd",
    "nivelUsd",
    "nivelVenda",
    "ajuste",
    "corretora",
    "contrato",
    "status",
    "totalBrl",
    "vencimento",
    "aReceber",
    "aPagar",
    "observacao",
  ],
  totais: ["valorUsd", "liquidacao", "saldoUsd", "ajuste", "totalBrl", "aReceber", "aPagar"],
  filtroStatus: "status",
  padrao: (ctx) => ({ data: ctx.hoje, status: "A LIQUIDAR", contrato: "NDF" }),
  validar: (d) => {
    const v = n0(d, "valorUsd");
    const l = n0(d, "liquidacao");
    if (txt(d, "tipo") === "COMPRA" && v < 0) return "Compra: o valor em US$ deve ser positivo.";
    if (txt(d, "tipo") === "VENDA" && v > 0) return "Venda: o valor em US$ deve ser negativo.";
    if (v !== 0 && l !== 0 && Math.sign(v) !== Math.sign(l)) return "A liquidacao deve ter o mesmo sinal do valor.";
    if (v !== 0 && Math.abs(l) > Math.abs(v)) return "A liquidacao nao pode ser maior que o valor contratado.";
    return null;
  },
  alerta: (d, ctx) => {
    const saldo = travaSaldo(d);
    const v = n0(d, "valorUsd");
    const l = n0(d, "liquidacao");
    // Linhas antigas (2023/2024) lancavam compra e venda em linhas separadas
    // (valor ou liquidacao zerado) e so fecham no conjunto - conferido no
    // indicador "Saldo das LIQUIDADAS". Aqui so a liquidacao parcial.
    if (txt(d, "status") === "LIQUIDADA" && v !== 0 && l !== 0 && saldo !== 0) return "Status LIQUIDADA com saldo em aberto.";
    // Planilha: sem NIVEL VENDA o desagio virava liquidado x nivel USD (valor cheio em R$).
    if (txt(d, "status") === "LIQUIDADA" && v !== 0 && l !== 0 && !num(d, "nivelVenda") && num(d, "ajusteInformado") === null)
      return "Liquidada sem NIVEL VENDA: ajuste nao calculado.";
    if (txt(d, "status") === "A LIQUIDAR" && saldo === 0) return "Status A LIQUIDAR sem saldo.";
    const venc = txt(d, "vencimento");
    if (txt(d, "status") === "A LIQUIDAR" && venc && venc < ctx.hoje) return "Vencimento ja passou.";
    return null;
  },
  indicadores: (rows, ctx) => {
    const abertas = rows.filter(ndfAberta);
    const compras = abertas.filter((d) => travaSaldo(d) > 0);
    const vendas = abertas.filter((d) => travaSaldo(d) < 0);
    const taxaMedia = (rs: Dados[]) => {
      const s = soma(rs, travaSaldo);
      return s === 0 ? null : soma(rs, (d) => travaSaldo(d) * travaTaxa(d)) / s;
    };
    const previstos = abertas.map((d) => ndfAjustePrevisto(d, ctx) ?? 0);
    const aReceber = previstos.filter((v) => v > 0).reduce((a, b) => a + b, 0);
    const aPagar = -previstos.filter((v) => v < 0).reduce((a, b) => a + b, 0);
    // Planilha: N1 = SUM(L:L)/SUM(C:C) - dividia o R$ do saldo pelo valor bruto
    // contratado (dava 0,2489). Corrigido: taxa media ponderada do saldo em aberto.
    return [
      { label: "A RECEBER no vencimento (R$)", valor: ctx.dolar ? aReceber : null, formato: "brl", destaque: true },
      { label: "A PAGAR no vencimento (R$)", valor: ctx.dolar ? aPagar : null, formato: "brl", destaque: true },
      { label: "Saldo liquido (receber - pagar)", valor: ctx.dolar ? aReceber - aPagar : null, formato: "brl", destaque: true },
      { label: "Saldo em aberto (US$)", valor: soma(abertas, travaSaldo), formato: "usd" },
      { label: "Compras em aberto (US$)", valor: soma(compras, travaSaldo), formato: "usd" },
      { label: "Taxa media compras", valor: taxaMedia(compras), formato: "num4" },
      { label: "Vendas em aberto (US$)", valor: soma(vendas, travaSaldo), formato: "usd" },
      { label: "Taxa media vendas", valor: taxaMedia(vendas), formato: "num4" },
      { label: "Ajuste realizado (R$)", valor: soma(rows, (d) => travaAjuste(d)), formato: "brl" },
      {
        label: "Saldo das LIQUIDADAS (deve ser 0)",
        valor: soma(rows.filter((d) => txt(d, "status") === "LIQUIDADA"), travaSaldo),
        formato: "usd",
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// ESTOQUE CAFE NAYME
// ---------------------------------------------------------------------------
// Planilha: cada linha era uma soma enorme digitada (=250+262+27+...), sem
// data nem origem. Agora cada entrada/saida e um lancamento proprio; o saldo
// e a soma com o sinal do tipo, como na planilha (vendas e devolucoes negativas).
export const ESTOQUE_TIPOS = [
  "ESTOQUE NAYME",
  "ESTOQUE A FIXAR",
  "ENTREGAS NAYME",
  "ENTREGAS A FIXAR",
  "VENDAS INTERNA",
  "VENDAS EXTERNAS",
  "DEVOLUCAO",
  "AJUSTE DE INVENTARIO",
] as const;

const ESTOQUE_SAIDAS = new Set(["VENDAS INTERNA", "VENDAS EXTERNAS", "DEVOLUCAO"]);

export function estoqueMovimento(d: Dados) {
  const s = n0(d, "sacas");
  const tipo = txt(d, "tipo");
  if (tipo === "AJUSTE DE INVENTARIO") return s; // ajuste entra com o sinal digitado
  return ESTOQUE_SAIDAS.has(tipo) ? -Math.abs(s) : Math.abs(s);
}

const estoque: AbaConfig = {
  slug: "estoque-cafe-nayme",
  label: "",
  descricao: "Entradas e saidas de estoque; o saldo e a soma de todos os lancamentos.",
  campos: [
    { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
    { key: "tipo", label: "TIPO", tipo: "opcao", opcoes: ESTOQUE_TIPOS, obrigatorio: true },
    {
      key: "sacas",
      label: "QTDE (sacas)",
      tipo: "numero",
      formato: "sacas",
      obrigatorio: true,
      ajuda: "Informe positivo - vendas e devolucoes saem do estoque automaticamente. Ajuste de inventario: use o sinal.",
    },
    { key: "precoMedio", label: "PRECO MEDIO (R$/saca)", tipo: "numero", formato: "brl" },
    { key: "observacao", label: "OBSERVACAO", tipo: "texto" },
  ],
  calculados: [{ key: "movimento", label: "MOVIMENTO (sacas)", formato: "sacas", calc: estoqueMovimento }],
  colunas: ["data", "tipo", "sacas", "movimento", "precoMedio", "observacao"],
  totais: ["movimento"],
  filtroStatus: "tipo",
  padrao: dataDe,
  indicadores: (rows) => [
    ...ESTOQUE_TIPOS.map((t) => ({
      label: t,
      valor: soma(rows.filter((d) => txt(d, "tipo") === t), estoqueMovimento),
      formato: "sacas" as Formato,
    })),
    { label: "SALDO ESTOQUE", valor: soma(rows, estoqueMovimento), formato: "sacas", destaque: true },
  ],
};

// ---------------------------------------------------------------------------
// VENDA MI
// ---------------------------------------------------------------------------
const vendaMi: AbaConfig = {
  slug: "venda-mi",
  label: "",
  descricao: "Vendas no mercado interno.",
  campos: [
    { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
    { key: "sacas", label: "QUANTIDADE SACAS", tipo: "numero", formato: "sacas", obrigatorio: true },
    { key: "cliente", label: "CLIENTE", tipo: "texto", sugestoes: true, obrigatorio: true },
    { key: "ordemVenda", label: "ORDEM VENDA", tipo: "texto" },
    { key: "valorUnit", label: "VLR. UNIT. R$", tipo: "numero", formato: "brl", obrigatorio: true },
    { key: "ny", label: "NY (c/lb)", tipo: "numero", formato: "centlb" },
    { key: "dolar", label: "DOLAR", tipo: "numero", formato: "num4" },
    { key: "padrao", label: "PADRAO", tipo: "texto", sugestoes: true },
    { key: "mesEntrega", label: "MES ENTREGA", tipo: "data" },
    { key: "dataEntrega", label: "DATA ENTREGA", tipo: "data" },
    { key: "dataLiquidacao", label: "DATA LIQUIDACAO", tipo: "data" },
    { key: "status", label: "STATUS", tipo: "opcao", opcoes: ["A EMBARCAR", "EMBARCADO"], obrigatorio: true },
  ],
  calculados: [
    {
      key: "diferencial",
      label: "DIFERENCIAL (c/lb)",
      formato: "centlb",
      calc: (d) => diferencialCentLb(num(d, "valorUnit"), num(d, "ny"), num(d, "dolar")),
      ajuda: "Vlr. unit. / 1,3228 / dolar - NY.",
    },
    {
      key: "bolsaBrl",
      label: "BOLSA R$",
      formato: "brl",
      calc: (d) =>
        diferencialBrl(num(d, "sacas"), diferencialCentLb(num(d, "valorUnit"), num(d, "ny"), num(d, "dolar")), num(d, "dolar")),
      ajuda: "Diferencial convertido para R$ x sacas. Na planilha era diferencial (c/lb) x sacas, sem converter.",
    },
    {
      key: "valorTotal",
      label: "VLOR TOTAL R$",
      formato: "brl",
      calc: (d) => n0(d, "sacas") * n0(d, "valorUnit"), // Planilha: J=B*E
    },
  ],
  colunas: [
    "data",
    "sacas",
    "cliente",
    "ordemVenda",
    "valorUnit",
    "ny",
    "dolar",
    "diferencial",
    "bolsaBrl",
    "valorTotal",
    "padrao",
    "mesEntrega",
    "dataEntrega",
    "dataLiquidacao",
    "status",
  ],
  totais: ["sacas", "bolsaBrl", "valorTotal"],
  filtroStatus: "status",
  padrao: (ctx) => ({ data: ctx.hoje, status: "A EMBARCAR", dolar: ctx.dolar, ny: ctx.ny }),
  indicadores: (rows) => {
    const sacas = soma(rows, (d) => num(d, "sacas"));
    const total = soma(rows, (d) => n0(d, "sacas") * n0(d, "valorUnit"));
    return [
      {
        label: "A embarcar (sacas)",
        valor: soma(rows.filter((d) => txt(d, "status") !== "EMBARCADO"), (d) => num(d, "sacas")),
        formato: "sacas",
        destaque: true,
      },
      { label: "Total vendido (sacas)", valor: sacas, formato: "sacas" },
      { label: "Preco medio (R$/saca)", valor: sacas ? total / sacas : null, formato: "brl" },
    ];
  },
};

// ---------------------------------------------------------------------------
// VENDAS MERC. EXTERNO NAYME
// ---------------------------------------------------------------------------
export const ME_STATUS = ["A FIXAR", "FIXADO", "PORTO", "CLIENTE", "FINANCIADO", "PAGO", "LIQUIDADO"] as const;

// UNIT US$ (US$/saca): preco fixo informado ou (NY + diferencial) x 1,3228.
// Planilha: J=(F+G)*1,3228 ou valor digitado.
export function meUnit(d: Dados) {
  const informado = num(d, "unitInformado");
  if (informado !== null) return informado;
  // NY vazio ou zero = preco ainda nao fixado (planilha calculava (0 + dif) x 1,3228).
  const f = num(d, "nyCentLb");
  if (!f) return null;
  return (f + n0(d, "diferencial")) * LB_SACA;
}

// TOTAL US$ = quantidade x unit - adiantamento.
// Planilha: K=B*J, K=B*J-I, K=(J*B)-I e K=B*J+I (linhas 48 a 51, com o
// adiantamento negativo). Corrigido: o adiantamento e sempre positivo e sempre abatido.
export function meTotal(d: Dados) {
  const u = meUnit(d);
  return (u === null ? 0 : n0(d, "quant") * u) - Math.abs(n0(d, "adto"));
}

const vendasMe: AbaConfig = {
  slug: "vendas-merc-externo-nayme",
  label: "",
  descricao: "Vendas para o mercado externo (contratos, fixacao, embarque e vinculo com ACC).",
  campos: [
    { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
    { key: "quant", label: "QUANT (sacas)", tipo: "numero", formato: "sacas", obrigatorio: true },
    { key: "cliente", label: "CLIENTE", tipo: "texto", sugestoes: true, obrigatorio: true },
    { key: "contrato", label: "CONTRATO", tipo: "texto" },
    { key: "frete", label: "FRETE", tipo: "texto", sugestoes: true },
    { key: "nyCentLb", label: "US$/LB (NY c/lb)", tipo: "numero", formato: "centlb" },
    { key: "diferencial", label: "DIFERENCIAL (c/lb)", tipo: "numero", formato: "centlb" },
    { key: "modalidade", label: "MODALIDADE", tipo: "texto", sugestoes: true, sugestoesFixas: ["FIXO", "BUYERS CALL", "SELLER`S CALL"] },
    { key: "adto", label: "ADTO (US$)", tipo: "numero", formato: "usd", ajuda: "Adiantamento recebido - abatido do total." },
    {
      key: "unitInformado",
      label: "UNIT US$ (preco fixo)",
      tipo: "numero",
      formato: "usd",
      ajuda: "Preencha so quando o preco for fixo em US$/saca. Vazio = (NY + diferencial) x 1,3228.",
    },
    { key: "oic", label: "OIC", tipo: "texto" },
    { key: "padrao", label: "PADRAO", tipo: "texto", sugestoes: true },
    { key: "pais", label: "PAIS", tipo: "texto", sugestoes: true },
    { key: "dataFixacao", label: "DATA FIXACAO", tipo: "data" },
    { key: "mesEmbarque", label: "MES EMBARQUE", tipo: "texto", sugestoes: true, ajuda: "Mes/ano ou IMEDIATO." },
    { key: "dataEmb", label: "DATA EMB", tipo: "data" },
    { key: "ndfDolar", label: "NDF DOLAR", tipo: "numero", formato: "num4" },
    { key: "status", label: "STATUS", tipo: "opcao", opcoes: ME_STATUS, obrigatorio: true },
    { key: "vinculoAcc", label: "VINCULO CONTRATO ACC", tipo: "texto" },
    { key: "observacoes", label: "VENCIMENTO / OBSERVACOES", tipo: "texto" },
    { key: "valorAUtilizar", label: "VALOR A ULTILIZAR", tipo: "numero", formato: "usd" },
  ],
  calculados: [
    {
      key: "diferencialEfetivo",
      label: "DIFERENCIAL EFETIVO (c/lb)",
      formato: "centlb",
      // Com preco fixo: unit / 1,3228 - NY (planilha G=J/1,3228-F, com G4:G7
      // apontando para a linha de baixo - corrigido para a propria linha).
      calc: (d) => {
        const f = num(d, "nyCentLb");
        const u = num(d, "unitInformado");
        if (u !== null && f !== null) return u / LB_SACA - f;
        return num(d, "diferencial");
      },
    },
    { key: "unitUsd", label: "UNIT US$", formato: "usd", calc: meUnit },
    { key: "totalUsd", label: "TOTAL US$", formato: "usd", calc: meTotal },
    {
      key: "totalBrl",
      label: "TOTAL R$ (dolar do dia)",
      formato: "brl",
      calc: (d, ctx) => (ctx.dolar ? meTotal(d) * ctx.dolar : null),
    },
  ],
  colunas: [
    "data",
    "quant",
    "cliente",
    "contrato",
    "frete",
    "nyCentLb",
    "diferencial",
    "diferencialEfetivo",
    "modalidade",
    "adto",
    "unitUsd",
    "totalUsd",
    "totalBrl",
    "oic",
    "padrao",
    "pais",
    "dataFixacao",
    "mesEmbarque",
    "dataEmb",
    "ndfDolar",
    "status",
    "vinculoAcc",
    "observacoes",
    "valorAUtilizar",
  ],
  totais: ["quant", "adto", "totalUsd", "totalBrl"],
  filtroStatus: "status",
  padrao: (ctx) => ({ data: ctx.hoje, status: "A FIXAR", ny: ctx.ny }),
  alerta: (d) => {
    if (txt(d, "status") !== "A FIXAR" && meUnit(d) === null) return "Sem preco: informe NY + diferencial ou o preco fixo.";
    return null;
  },
  indicadores: (rows) => {
    const fixado = rows.filter((d) => txt(d, "status") === "FIXADO");
    const sacas = soma(fixado, (d) => num(d, "quant"));
    const usd = soma(fixado, meTotal);
    return [
      { label: "Fixado (sacas)", valor: sacas, formato: "sacas", destaque: true },
      { label: "Fixado (US$)", valor: usd, formato: "usd", destaque: true },
      { label: "Preco medio fixado (US$/saca)", valor: sacas ? usd / sacas : null, formato: "usd" },
      {
        label: "A fixar (sacas)",
        valor: soma(rows.filter((d) => txt(d, "status") === "A FIXAR"), (d) => num(d, "quant")),
        formato: "sacas",
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// BOLSA NY - NAYME
// ---------------------------------------------------------------------------
export function bolsaSacas(d: Dados) {
  return n0(d, "lotes") * SACAS_LOTE; // Planilha: C=B*283,5
}

// Planilha: E=C*D e K=C*D ate a linha 2540 (sacas x c/lb, sem converter) e
// K=C*D*1,3228 a partir da 2541. Corrigido para US$ em todas as linhas.
export function bolsaUsd(d: Dados) {
  return bolsaSacas(d) * n0(d, "nivel") * LB_SACA;
}

const camposBolsa: Campo[] = [
  { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
  {
    key: "lotes",
    label: "LOTES",
    tipo: "numero",
    formato: "lotes",
    obrigatorio: true,
    ajuda: "Venda negativo, compra positivo (como na planilha).",
  },
  { key: "nivel", label: "NIVEL (c/lb)", tipo: "numero", formato: "centlb", obrigatorio: true },
  { key: "corretora", label: "CORRETORA", tipo: "texto", sugestoes: true, sugestoesFixas: ["HEDGEPOINT", "MAREX", "STONEX"] },
  { key: "kc", label: "KC", tipo: "texto", sugestoes: true, obrigatorio: true, ajuda: "Ex.: KCZ6" },
  { key: "status", label: "STATUS", tipo: "opcao", opcoes: STATUS_COMPRA_VENDA, obrigatorio: true },
  { key: "opcao", label: "OPCAO (vencimento)", tipo: "texto", sugestoes: true },
  { key: "posicao", label: "STATUS POSICAO", tipo: "opcao", opcoes: ["SHORT", "LONG"] },
];

function validarBolsa(d: Dados) {
  const l = n0(d, "lotes");
  if (l === 0) return "Informe os lotes.";
  if (txt(d, "status") === "VENDA" && l > 0) return "Venda: os lotes devem ser negativos.";
  if (txt(d, "status") === "COMPRA" && l < 0) return "Compra: os lotes devem ser positivos.";
  return null;
}

function alertaBolsa(d: Dados) {
  const l = n0(d, "lotes");
  if ((txt(d, "status") === "VENDA" && l > 0) || (txt(d, "status") === "COMPRA" && l < 0))
    return "Sinal dos lotes nao bate com COMPRA/VENDA.";
  return null;
}

const bolsaNy: AbaConfig = {
  slug: "bolsa-ny-nayme",
  label: "",
  descricao: "Operacoes de futuros de cafe na ICE NY (KC). A soma das sacas e a posicao em bolsa.",
  campos: [
    ...camposBolsa,
    { key: "usdFechamento", label: "US$ FECHAMENTO", tipo: "texto" },
    { key: "valorAjustado", label: "VALOR AJUSTADO", tipo: "texto" },
    { key: "ajusteDiario", label: "VALOR AJUSTE DIARIO", tipo: "texto" },
  ],
  calculados: [
    { key: "sacas", label: "SACAS", formato: "sacas", calc: bolsaSacas, ajuda: "Lotes x 283,5." },
    { key: "totalUsd", label: "TOTAL US$", formato: "usd", calc: bolsaUsd, ajuda: "Sacas x nivel (c/lb) x 1,3228." },
  ],
  colunas: [
    "data",
    "lotes",
    "sacas",
    "nivel",
    "totalUsd",
    "corretora",
    "kc",
    "status",
    "opcao",
    "posicao",
    "usdFechamento",
    "valorAjustado",
    "ajusteDiario",
  ],
  totais: ["lotes", "sacas", "totalUsd"],
  filtroStatus: "status",
  padrao: (ctx) => ({ data: ctx.hoje, posicao: "SHORT" }),
  validar: validarBolsa,
  alerta: alertaBolsa,
  indicadores: (rows, ctx) => {
    const sacas = soma(rows, bolsaSacas);
    const lotes = soma(rows, (d) => num(d, "lotes"));
    // Posicao por vencimento (KC): o que sobra em aberto em cada contrato.
    return [
      { label: "Posicao (lotes)", valor: lotes, formato: "lotes", destaque: true },
      { label: "Posicao (sacas)", valor: sacas, formato: "sacas", destaque: true },
      {
        label: "Posicao a NY atual (US$)",
        valor: ctx.ny !== null ? sacas * ctx.ny * LB_SACA : null,
        formato: "usd",
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// COMPRAS EM R$ - NAYME
// ---------------------------------------------------------------------------
const compras: AbaConfig = {
  slug: "compras-em-reais-nayme",
  label: "",
  descricao: "Compras de cafe em reais (preco fixo) e entregas.",
  campos: [
    { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
    { key: "sacas", label: "QUANTIDADE SACAS", tipo: "numero", formato: "sacas", obrigatorio: true },
    { key: "produtor", label: "PRODUTOR", tipo: "texto", sugestoes: true, obrigatorio: true },
    { key: "ordemCompra", label: "ORDEM COMPRA", tipo: "texto" },
    { key: "valorSaca", label: "VR. SACA R$", tipo: "numero", formato: "brl", obrigatorio: true },
    { key: "ny", label: "NY (c/lb)", tipo: "numero", formato: "centlb" },
    { key: "dolar", label: "DOLAR", tipo: "numero", formato: "num4" },
    { key: "padrao", label: "PADRAO", tipo: "texto", sugestoes: true },
    { key: "peneira", label: "PENEIRA", tipo: "texto", sugestoes: true },
    { key: "dataEntrega", label: "DATA ENTREGA", tipo: "data" },
    { key: "embalagem", label: "EMBALAGEM", tipo: "texto", sugestoes: true, sugestoesFixas: ["GRANEL", "BIG BAG"] },
    { key: "status", label: "STATUS", tipo: "opcao", opcoes: ["COMPRADO", "ENTREGUE"], obrigatorio: true },
    { key: "observacao", label: "OBSERVACAO", tipo: "texto" },
  ],
  calculados: [
    {
      key: "diferencial",
      label: "DIFERENCIAL (c/lb)",
      formato: "centlb",
      calc: (d) => diferencialCentLb(num(d, "valorSaca"), num(d, "ny"), num(d, "dolar")),
    },
    {
      key: "ajusteBolsaBrl",
      label: "AJUSTE BOLSA R$",
      formato: "brl",
      calc: (d) =>
        diferencialBrl(num(d, "sacas"), diferencialCentLb(num(d, "valorSaca"), num(d, "ny"), num(d, "dolar")), num(d, "dolar")),
      ajuda: "Diferencial em R$ x sacas. Na planilha era diferencial (c/lb) x sacas.",
    },
    { key: "valorTotal", label: "VLR. TOTAL R$", formato: "brl", calc: (d) => n0(d, "sacas") * n0(d, "valorSaca") },
  ],
  colunas: [
    "data",
    "sacas",
    "produtor",
    "ordemCompra",
    "valorSaca",
    "ny",
    "dolar",
    "diferencial",
    "ajusteBolsaBrl",
    "valorTotal",
    "padrao",
    "peneira",
    "dataEntrega",
    "embalagem",
    "status",
    "observacao",
  ],
  totais: ["sacas", "ajusteBolsaBrl", "valorTotal"],
  filtroStatus: "status",
  padrao: (ctx) => ({ data: ctx.hoje, status: "COMPRADO", embalagem: "GRANEL", dolar: ctx.dolar, ny: ctx.ny }),
  indicadores: (rows) => {
    const sacas = soma(rows, (d) => num(d, "sacas"));
    const total = soma(rows, (d) => n0(d, "sacas") * n0(d, "valorSaca"));
    return [
      {
        label: "A entregar (sacas)",
        valor: soma(rows.filter((d) => txt(d, "status") !== "ENTREGUE"), (d) => num(d, "sacas")),
        formato: "sacas",
        destaque: true,
      },
      { label: "Total comprado (sacas)", valor: sacas, formato: "sacas" },
      // Planilha: E1 = SUM(J)/SUM(B)
      { label: "Media compra (R$/saca)", valor: sacas ? total / sacas : null, formato: "brl", destaque: true },
    ];
  },
};

// ---------------------------------------------------------------------------
// CAFES A FIXAR - NAYME
// ---------------------------------------------------------------------------
// Convencao da planilha: QUANT. A FIXAR negativa (cafe recebido do produtor,
// preco ainda a fixar = posicao vendida em NY), FIXADAS positiva.
export function aFixarSaldo(d: Dados) {
  return n0(d, "qtdAFixar") + n0(d, "fixadas"); // Planilha: D=B+C
}

const cafesAFixar: AbaConfig = {
  slug: "cafes-a-fixar-nayme",
  label: "",
  descricao: "Cafes recebidos com preco a fixar e as fixacoes feitas pelos produtores.",
  campos: [
    { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
    {
      key: "qtdAFixar",
      label: "QUANT. A FIXAR",
      tipo: "numero",
      formato: "sacas",
      obrigatorio: true,
      ajuda: "Negativo, como na planilha (ex.: -184).",
    },
    { key: "fixadas", label: "FIXADAS", tipo: "numero", formato: "sacas", ajuda: "Total ja fixado (positivo)." },
    { key: "produtor", label: "PRODUTOR", tipo: "texto", sugestoes: true, obrigatorio: true },
    { key: "valorSaca", label: "VR. SACA R$", tipo: "numero", formato: "brl" },
    { key: "padrao", label: "PADRAO", tipo: "texto", sugestoes: true },
    { key: "peneira", label: "PENEIRA", tipo: "texto", sugestoes: true },
    { key: "ordemCompra", label: "ORDEM COMPRA", tipo: "texto" },
    { key: "ny", label: "NY (c/lb)", tipo: "numero", formato: "centlb" },
    { key: "dolar", label: "DOLAR", tipo: "numero", formato: "num4" },
    { key: "dataFixacao", label: "DATA FIXACAO", tipo: "data" },
    { key: "status", label: "STATUS", tipo: "opcao", opcoes: ["A FIXAR", "FIXADO"], obrigatorio: true },
    { key: "adto", label: "ADTO", tipo: "texto" },
  ],
  calculados: [
    { key: "saldo", label: "SALDO A FIXAR", formato: "sacas", calc: aFixarSaldo },
    {
      key: "valorTotal",
      label: "VLR. TOTAL R$",
      formato: "brl",
      calc: (d) => n0(d, "fixadas") * n0(d, "valorSaca"), // Planilha: G=C*F
    },
    {
      key: "diferencial",
      label: "DIFERENCIAL (c/lb)",
      formato: "centlb",
      // Planilha: M=(F/1,3228/L)-K - dava #DIV/0! sem dolar e -NY sem preco.
      calc: (d) => (n0(d, "valorSaca") > 0 ? diferencialCentLb(num(d, "valorSaca"), num(d, "ny"), num(d, "dolar")) : null),
    },
  ],
  colunas: [
    "data",
    "qtdAFixar",
    "fixadas",
    "saldo",
    "produtor",
    "valorSaca",
    "valorTotal",
    "padrao",
    "peneira",
    "ordemCompra",
    "ny",
    "dolar",
    "diferencial",
    "dataFixacao",
    "status",
    "adto",
  ],
  totais: ["qtdAFixar", "fixadas", "saldo", "valorTotal"],
  filtroStatus: "status",
  padrao: (ctx) => ({ data: ctx.hoje, status: "A FIXAR" }),
  validar: (d) => {
    if (n0(d, "qtdAFixar") > 0) return "QUANT. A FIXAR deve ser negativa (como na planilha).";
    if (n0(d, "fixadas") < 0) return "FIXADAS deve ser positiva.";
    return null;
  },
  alerta: (d) => {
    const s = aFixarSaldo(d);
    if (s > 0.005) return "Fixado mais que o recebido (saldo positivo).";
    if (txt(d, "status") === "FIXADO" && s < -0.005) return "Status FIXADO com saldo a fixar.";
    if (n0(d, "fixadas") < 0) return "FIXADAS negativa.";
    return null;
  },
  indicadores: (rows) => [
    {
      label: "Saldo a fixar (sacas)",
      valor: soma(rows.filter((d) => txt(d, "status") === "A FIXAR"), aFixarSaldo),
      formato: "sacas",
      destaque: true,
    },
    { label: "Total recebido a fixar", valor: soma(rows, (d) => num(d, "qtdAFixar")), formato: "sacas" },
    { label: "Total fixado", valor: soma(rows, (d) => num(d, "fixadas")), formato: "sacas" },
  ],
};

// ---------------------------------------------------------------------------
// ENDIVIDAMENTO NAYME
// ---------------------------------------------------------------------------
// Convencao da planilha: VALOR US$ negativo (divida).
export function endivSaldo(d: Dados) {
  return n0(d, "valorUsd") + Math.abs(n0(d, "liquidado")); // Planilha: K=D+pagamentos digitados; L=K
}

// Juros do ACC (linear, base 360) sobre o saldo, da data de contratacao ate a
// liquidacao (ou hoje, o que vier antes). A planilha tinha a taxa mas nao usava.
export function endivJuros(d: Dados, ctx: Ctx) {
  const saldo = endivSaldo(d);
  const taxa = num(d, "taxaJuros");
  const ini = txt(d, "data");
  if (saldo >= 0 || !taxa || !ini) return 0;
  const liq = txt(d, "dataLiquidacao");
  const fim = liq && liq < ctx.hoje ? liq : ctx.hoje;
  const dias = Math.max(0, diasEntre(ini, fim));
  return (saldo * (taxa / 100) * dias) / 360;
}

const endividamento: AbaConfig = {
  slug: "endividamento-nayme",
  label: "",
  descricao: "Contratos de ACC: valor, taxa, liquidacoes, saldo e juros.",
  campos: [
    { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
    { key: "numContrato", label: "NUM.CONTRATO", tipo: "texto" },
    { key: "banco", label: "BANCO", tipo: "texto", sugestoes: true, obrigatorio: true },
    { key: "valorUsd", label: "VALOR US$", tipo: "numero", formato: "usd", obrigatorio: true, ajuda: "Negativo (divida), como na planilha." },
    { key: "taxa", label: "TXA (R$/US$)", tipo: "numero", formato: "num4", obrigatorio: true },
    { key: "taxaJuros", label: "TAXA JUROS (% a.a.)", tipo: "numero", formato: "pct", obrigatorio: true },
    { key: "dataLiquidacao", label: "DATA LIQUIDACAO", tipo: "data", obrigatorio: true },
    { key: "status", label: "STATUS", tipo: "opcao", opcoes: ["A LIQUIDAR", "LIQUIDADO"], obrigatorio: true },
    { key: "invoice", label: "INVOICE VINCULADA", tipo: "texto" },
    {
      key: "liquidado",
      label: "VALOR LIQUIDADO US$",
      tipo: "numero",
      formato: "usd",
      ajuda: "Soma das liquidacoes (positivo). Detalhe cada liquidacao em Observacao.",
    },
    { key: "observacao", label: "OBSERVACAO", tipo: "texto" },
    { key: "cambioPronto", label: "CAMBIO PRONTO", tipo: "texto" },
  ],
  calculados: [
    {
      key: "valorBrl",
      label: "VALOR R$",
      formato: "brl",
      calc: (d) => n0(d, "valorUsd") * n0(d, "taxa"), // Planilha: G=D*E
    },
    { key: "saldoUsd", label: "SALDO A LIQUIDAR", formato: "usd", calc: endivSaldo },
    {
      key: "juros",
      label: "JUROS ACUMULADOS US$",
      formato: "usd",
      calc: endivJuros,
      ajuda: "Saldo x taxa x dias corridos / 360, ate a liquidacao ou hoje.",
    },
    {
      key: "saldoBrlHoje",
      label: "SALDO R$ (dolar do dia)",
      formato: "brl",
      calc: (d, ctx) => (ctx.dolar ? (endivSaldo(d) + endivJuros(d, ctx)) * ctx.dolar : null),
    },
  ],
  colunas: [
    "data",
    "numContrato",
    "banco",
    "valorUsd",
    "taxa",
    "taxaJuros",
    "valorBrl",
    "dataLiquidacao",
    "status",
    "invoice",
    "liquidado",
    "saldoUsd",
    "juros",
    "saldoBrlHoje",
    "observacao",
    "cambioPronto",
  ],
  totais: ["valorUsd", "valorBrl", "liquidado", "saldoUsd", "juros", "saldoBrlHoje"],
  filtroStatus: "status",
  padrao: (ctx) => ({ data: ctx.hoje, status: "A LIQUIDAR" }),
  validar: (d) => {
    if (n0(d, "valorUsd") >= 0) return "VALOR US$ deve ser negativo (divida).";
    if (Math.abs(n0(d, "liquidado")) > Math.abs(n0(d, "valorUsd")) + 0.01) return "Valor liquidado maior que o contrato.";
    const ini = txt(d, "data");
    const fim = txt(d, "dataLiquidacao");
    if (ini && fim && fim < ini) return "A data de liquidacao e anterior a data do contrato.";
    return null;
  },
  alerta: (d, ctx) => {
    const saldo = endivSaldo(d);
    const ini = txt(d, "data");
    const fim = txt(d, "dataLiquidacao");
    if (ini && fim && fim < ini) return "Data de liquidacao anterior a data do contrato.";
    if (txt(d, "status") === "LIQUIDADO" && Math.abs(saldo) > 0.01) return "Status LIQUIDADO com saldo.";
    if (txt(d, "status") === "A LIQUIDAR" && Math.abs(saldo) <= 0.01) return "Saldo zerado: mudar status para LIQUIDADO.";
    if (txt(d, "status") === "A LIQUIDAR" && fim && fim < ctx.hoje) return "Vencido.";
    return null;
  },
  indicadores: (rows, ctx) => {
    const saldo = soma(rows, endivSaldo);
    const juros = soma(rows, (d) => endivJuros(d, ctx));
    const abertos = rows.filter((d) => Math.abs(endivSaldo(d)) > 0.01);
    const taxaMedia = saldo ? soma(abertos, (d) => endivSaldo(d) * n0(d, "taxaJuros")) / saldo : null;
    return [
      { label: "Saldo a liquidar (US$)", valor: saldo, formato: "usd", destaque: true },
      { label: "Juros acumulados (US$)", valor: juros, formato: "usd" },
      { label: "Saldo + juros (US$)", valor: saldo + juros, formato: "usd", destaque: true },
      { label: "Taxa media ponderada (% a.a.)", valor: taxaMedia, formato: "pct" },
      { label: "Saldo + juros (R$, dolar do dia)", valor: ctx.dolar ? (saldo + juros) * ctx.dolar : null, formato: "brl" },
    ];
  },
};

// ---------------------------------------------------------------------------
// COMPRAS FUTURAS / VENDAS FUTURAS
// ---------------------------------------------------------------------------
function futuras(slug: string, nome: "PRODUTOR" | "CLIENTE", descricao: string): AbaConfig {
  return {
    slug,
    label: "",
    descricao,
    campos: [
      { key: "data", label: "DATA", tipo: "data", obrigatorio: true },
      { key: "sacas", label: "QUANTIDADE SACAS", tipo: "numero", formato: "sacas", obrigatorio: true },
      { key: "nome", label: nome, tipo: "texto", sugestoes: true, obrigatorio: true },
      { key: "valorSaca", label: "VR. SACA R$", tipo: "numero", formato: "brl", obrigatorio: true },
      { key: "padrao", label: "PADRAO", tipo: "texto", sugestoes: true },
      { key: "peneira", label: "PENEIRA", tipo: "texto", sugestoes: true },
      { key: "dataEntrega", label: "DATA ENTREGA", tipo: "data" },
      { key: "embalagem", label: "EMBALAGEM", tipo: "texto", sugestoes: true, sugestoesFixas: ["GRANEL", "BIG BAG"] },
      { key: "status", label: "STATUS", tipo: "opcao", opcoes: ["A LIQUIDAR", "LIQUIDADO"], obrigatorio: true },
      { key: "observacao", label: "OBSERVACAO", tipo: "texto" },
    ],
    calculados: [
      { key: "valorTotal", label: "VLR. TOTAL R$", formato: "brl", calc: (d) => n0(d, "sacas") * n0(d, "valorSaca") },
    ],
    colunas: ["data", "sacas", "nome", "valorSaca", "valorTotal", "padrao", "peneira", "dataEntrega", "embalagem", "status", "observacao"],
    totais: ["sacas", "valorTotal"],
    filtroStatus: "status",
    padrao: (ctx) => ({ data: ctx.hoje, status: "A LIQUIDAR" }),
    indicadores: (rows) => [
      {
        label: "Em aberto (sacas)",
        valor: soma(rows.filter((d) => txt(d, "status") !== "LIQUIDADO"), (d) => num(d, "sacas")),
        formato: "sacas",
        destaque: true,
      },
      {
        label: "Em aberto (R$)",
        valor: soma(rows.filter((d) => txt(d, "status") !== "LIQUIDADO"), (d) => n0(d, "sacas") * n0(d, "valorSaca")),
        formato: "brl",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// RESUMO TRADES
// ---------------------------------------------------------------------------
export const RESUMO_OPERACOES_FISICAS = [
  "COMPRA A VISTA - CD",
  "COMPRA A VISTA - FC",
  "COMPRA A VISTA - GC - 1",
  "COMPRA A VISTA - GC - 2",
  "COMPRA A VISTA - RM",
  "COMPRA A VISTA - RESIDUO",
  "COMPRA A VISTA - CONSUMO",
  "COMPRA CONILLON",
  "COMPRA 2024/2025",
  "COMPRA 2025/2026",
  "VENDA MERCADO INTERNO CD",
  "VENDA MERCADO INTERNO RIO",
  "VENDA MERCADO INTERNO GC2",
  "VENDA EXPORTACAO",
  "FIXACAO MERCADO INTERNO",
  "FIXACAO MERCADO EXTERNO",
] as const;

export const RESUMO_OPERACOES_BOLSA = [
  "VENDA NY",
  "COMPRA NY",
  "VENDA DOLAR B3",
  "COMPRA DOLAR B3",
  "NDF $",
  "KCR$",
  "ACC",
] as const;

export const RESUMO_FECHAMENTO = ["KC (NY)", "DOLAR COMERCIAL", "ARB. LONDRES X NY", "ARB. B3 X NY"] as const;

const resumoTrades: AbaConfig = {
  slug: "resumo-trades",
  label: "",
  descricao: "Resumo diario dos trades: operacoes fisicas, operacoes em bolsa/bancos e fechamento de mercado.",
  campos: [
    { key: "data", label: "DATA DO RESUMO", tipo: "data", obrigatorio: true },
    {
      key: "secao",
      label: "SECAO",
      tipo: "opcao",
      opcoes: ["OPERACOES FISICAS", "OPERACOES EM BOLSA/BANCOS", "FECHAMENTO DE MERCADO"],
      obrigatorio: true,
    },
    {
      key: "operacao",
      label: "OPERACAO",
      tipo: "texto",
      obrigatorio: true,
      sugestoesFixas: [...RESUMO_OPERACOES_FISICAS, ...RESUMO_OPERACOES_BOLSA, ...RESUMO_FECHAMENTO],
    },
    { key: "quantidade", label: "QUANTIDADE (sacas)", tipo: "numero", formato: "sacas" },
    { key: "diferencial", label: "DIFERENCIAL (c/lb)", tipo: "numero", formato: "centlb" },
    { key: "lotes", label: "QUANT. LOTES", tipo: "numero", formato: "lotes" },
    { key: "valor", label: "VALOR / FECHAMENTO", tipo: "numero", formato: "num4" },
    { key: "observacao", label: "OBSERVACAO", tipo: "texto" },
  ],
  calculados: [
    {
      key: "sacasLotes",
      label: "QUANTID. SACAS (lotes)",
      formato: "sacas",
      calc: (d) => (num(d, "lotes") === null ? null : n0(d, "lotes") * SACAS_LOTE),
    },
  ],
  colunas: ["data", "secao", "operacao", "quantidade", "diferencial", "lotes", "sacasLotes", "valor", "observacao"],
  totais: [],
  filtroStatus: "secao",
  padrao: (ctx) => ({ data: ctx.hoje, secao: "OPERACOES FISICAS" }),
  indicadores: (rows) => {
    // Planilha: TOTAL DE COMPRAS / TOTAL DE VENDAS ficavam em branco. Agora:
    // soma das quantidades e diferencial medio ponderado, no resumo mais recente.
    const ultima = rows.reduce((m, d) => (txt(d, "data") > m ? txt(d, "data") : m), "");
    const doDia = rows.filter((d) => txt(d, "data") === ultima && txt(d, "secao") === "OPERACOES FISICAS");
    const grupo = (prefixo: string) => doDia.filter((d) => txt(d, "operacao").startsWith(prefixo));
    const medio = (rs: Dados[]) => {
      const q = soma(rs, (d) => (num(d, "diferencial") === null ? 0 : n0(d, "quantidade")));
      return q ? soma(rs, (d) => n0(d, "quantidade") * n0(d, "diferencial")) / q : null;
    };
    return [
      { label: "Resumo mais recente", valor: null, formato: "texto", texto: ultima ? ultima.split("-").reverse().join("/") : "-" },
      { label: "Total de compras (sacas)", valor: soma(grupo("COMPRA"), (d) => num(d, "quantidade")), formato: "sacas", destaque: true },
      { label: "Diferencial medio compras (c/lb)", valor: medio(grupo("COMPRA")), formato: "centlb" },
      { label: "Total de vendas (sacas)", valor: soma(grupo("VENDA"), (d) => num(d, "quantidade")), formato: "sacas", destaque: true },
      { label: "Diferencial medio vendas (c/lb)", valor: medio(grupo("VENDA")), formato: "centlb" },
    ];
  },
};

const configs: AbaConfig[] = [
  travaNdf,
  estoque,
  vendaMi,
  vendasMe,
  bolsaNy,
  compras,
  cafesAFixar,
  endividamento,
  futuras("compras-futuras", "PRODUTOR", "Compras para entrega futura."),
  futuras("vendas-futuras", "CLIENTE", "Vendas para entrega futura."),
  resumoTrades,
];

for (const c of configs) {
  const aba = hedgeCambialAbas.find((a) => a.slug === c.slug);
  if (!aba) throw new Error(`Aba sem menu: ${c.slug}`);
  c.label = aba.label;
}

export const HEDGE_ABAS: Record<string, AbaConfig> = Object.fromEntries(configs.map((c) => [c.slug, c]));

export function getAbaConfig(slug: string): AbaConfig | undefined {
  return HEDGE_ABAS[slug];
}

// Normaliza os dados de um lancamento conforme os campos da aba (tipos e
// obrigatorios) e aplica as validacoes da aba. Usado no servidor antes de gravar.
// `listas`: itens cadastrados de cada CADASTRO usado pela aba; `anterior`: dados
// atuais do lancamento (um valor antigo fora da lista continua aceito na edicao).
export function normalizarDados(
  aba: AbaConfig,
  entrada: Record<string, unknown>,
  listas: Record<string, string[]> = {},
  anterior?: Dados
): { dados: Dados } | { erro: string } {
  const dados: Dados = {};
  for (const campo of aba.campos) {
    const bruto = entrada[campo.key];
    let v: Valor = null;
    if (bruto !== null && bruto !== undefined && String(bruto).trim() !== "") {
      const s = String(bruto).trim();
      if (campo.tipo === "numero") {
        const n = typeof bruto === "number" ? bruto : Number(s);
        if (!Number.isFinite(n)) return { erro: `${campo.label}: numero invalido.` };
        v = n;
      } else if (campo.tipo === "data") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { erro: `${campo.label}: data invalida.` };
        v = s;
      } else if (campo.tipo === "opcao") {
        if (campo.opcoes && !campo.opcoes.includes(s)) return { erro: `${campo.label}: opcao invalida.` };
        v = s;
      } else {
        v = s;
      }
    }
    if (campo.obrigatorio && v === null) return { erro: `Preencha ${campo.label}.` };
    if (campo.cadastro && v !== null && !(listas[campo.cadastro] ?? []).includes(String(v)) && anterior?.[campo.key] !== v)
      return { erro: `${campo.label}: escolha uma opcao cadastrada (ou cadastre "${v}").` };
    dados[campo.key] = v;
  }
  const erro = aba.validar?.(dados);
  if (erro) return { erro };
  return { dados };
}
