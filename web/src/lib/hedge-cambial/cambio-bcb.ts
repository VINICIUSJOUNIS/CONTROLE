// Painel de cambio com dados oficiais do Banco Central (APIs publicas):
// - PTAX: boletins do dia (abertura ~10h, intermediarios ~11h/12h/13h e
//   fechamento ~13h10) - o dado oficial mais "em tempo real" que o BCB publica;
// - Focus: projecao do mercado para o dolar no fim do ano (atualizada a cada dia
//   util, divulgada as segundas);
// - Atuacoes do BCB no cambio (leiloes de venda a vista, swap, linha) - arquivo
//   que o BCB atualiza ate o ultimo dia util do mes anterior.
// O BCB NAO publica o livro de ofertas de compra/venda de dolar em tempo real
// (isso e dado de mercado da B3, pago). O fluxo cambial (entradas e saidas)
// sai so em nota semanal, sem API aberta.
import { unstable_cache } from "next/cache";

export const CAMBIO_REVALIDAR_SEGUNDOS = 5 * 60;
export const CAMBIO_TAG = "hedge-cambio-bcb";

export type Boletim = { dataHora: string; tipo: string; compra: number; venda: number };
export type DiaPtax = { data: string; boletins: Boletim[]; fechamento: number | null };
export type Focus = { ano: string; mediana: number; data: string; medianaAnterior: number | null; dataAnterior: string | null };
export type Atuacao = {
  data: string;
  instrumento: string;
  modalidade: string;
  composto: string;
  ofertado: number | null;
  aceito: number | null;
  taxaCorte: number | null;
  vencimento: string | null;
};
export type Sinal = { nome: string; direcao: "ALTA" | "QUEDA" | "ESTAVEL" | "SEM DADO"; detalhe: string };

const OLINDA = "https://olinda.bcb.gov.br/olinda/servico";
const ATUACOES_CSV = "https://www.bcb.gov.br/conteudo/dadosabertos/BCBDepin/historico-atuacoes-mercado-cambio.csv";

async function baixar(url: string) {
  const res = await fetch(url, {
    cache: "no-store", // o cache e do painel inteiro (unstable_cache abaixo)
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ControleNayme/1.0)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

const mmddyyyy = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;

// PTAX de todos os boletins dos ultimos 15 dias corridos, agrupados por dia.
async function ptax(): Promise<DiaPtax[]> {
  const fim = new Date();
  const ini = new Date(fim.getTime() - 15 * 86400000);
  const url =
    `${OLINDA}/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@moeda='USD'&@dataInicial='${mmddyyyy(ini)}'&@dataFinalCotacao='${mmddyyyy(fim)}'` +
    `&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao,tipoBoletim`;
  const json = (await (await baixar(url)).json()) as {
    value: { cotacaoCompra: number; cotacaoVenda: number; dataHoraCotacao: string; tipoBoletim: string }[];
  };
  const dias = new Map<string, DiaPtax>();
  for (const v of json.value) {
    const data = v.dataHoraCotacao.slice(0, 10);
    const dia = dias.get(data) ?? { data, boletins: [], fechamento: null };
    dia.boletins.push({ dataHora: v.dataHoraCotacao.slice(0, 16), tipo: v.tipoBoletim, compra: v.cotacaoCompra, venda: v.cotacaoVenda });
    if (v.tipoBoletim === "Fechamento") dia.fechamento = v.cotacaoVenda;
    dias.set(data, dia);
  }
  return Array.from(dias.values()).sort((a, b) => a.data.localeCompare(b.data));
}

// Focus: mediana do cambio de fim de ano (ano corrente e seguinte), hoje e ~4 semanas antes.
async function focus(): Promise<Focus[]> {
  const url =
    `${OLINDA}/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais` +
    `?$filter=Indicador%20eq%20'C%C3%A2mbio'%20and%20baseCalculo%20eq%200&$orderby=Data%20desc&$top=300&$format=json` +
    `&$select=Data,DataReferencia,Mediana`;
  const json = (await (await baixar(url)).json()) as { value: { Data: string; DataReferencia: string; Mediana: number }[] };
  const anoAtual = String(new Date().getFullYear());
  const anos = [anoAtual, String(Number(anoAtual) + 1)];
  return anos.flatMap((ano) => {
    const serie = json.value.filter((v) => v.DataReferencia === ano).sort((a, b) => b.Data.localeCompare(a.Data));
    if (!serie.length) return [];
    const atual = serie[0];
    const limite = new Date(new Date(atual.Data).getTime() - 28 * 86400000).toISOString().slice(0, 10);
    const anterior = serie.find((v) => v.Data <= limite) ?? null;
    return [
      {
        ano,
        mediana: atual.Mediana,
        data: atual.Data,
        medianaAnterior: anterior?.Mediana ?? null,
        dataAnterior: anterior?.Data ?? null,
      },
    ];
  });
}

function numeroBr(s: string | undefined) {
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Linha de CSV com campos entre aspas (os valores usam virgula decimal).
function camposCsv(linha: string) {
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === "," && !aspas) {
      out.push(atual);
      atual = "";
    } else atual += ch;
  }
  out.push(atual);
  return out;
}

// Atuacoes dos ultimos 90 dias do arquivo (que vai ate o fim do mes anterior).
async function atuacoes(): Promise<{ lista: Atuacao[]; ate: string | null }> {
  const texto = (await (await baixar(ATUACOES_CSV)).text()).replace(/^﻿/, "");
  const linhas = texto.split(/\r?\n/).filter(Boolean);
  const cab = camposCsv(linhas[0]);
  const i = (nome: string) => cab.indexOf(nome);
  const [iData, iInstr, iMod, iComp, iVenc, iOf, iAc, iTaxa] = [
    "Data",
    "Instrumento",
    "Modalidade",
    "Tipo Composto",
    "Data de Vencimento",
    "Volume USD Ofertado",
    "Volume USD Aceito",
    "Taxa de Corte",
  ].map(i);
  const todas = linhas.slice(1).map((l) => {
    const c = camposCsv(l);
    return {
      data: (c[iData] ?? "").slice(0, 10),
      instrumento: c[iInstr] ?? "",
      modalidade: c[iMod] ?? "",
      composto: c[iComp] ?? "",
      ofertado: numeroBr(c[iOf]),
      aceito: numeroBr(c[iAc]),
      taxaCorte: numeroBr(c[iTaxa]),
      vencimento: (c[iVenc] ?? "").slice(0, 10) || null,
    };
  });
  const ate = todas.reduce((m, a) => (a.data > m ? a.data : m), "");
  if (!ate) return { lista: [], ate: null };
  const limite = new Date(new Date(ate).getTime() - 90 * 86400000).toISOString().slice(0, 10);
  return { lista: todas.filter((a) => a.data >= limite).sort((a, b) => b.data.localeCompare(a.data)), ate };
}

const pct = (a: number, b: number) => ((a - b) / b) * 100;
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;
const fmtR = (v: number) => `R$ ${v.toFixed(4).replace(".", ",")}`;

// Sinais de tendencia a partir dos dados oficiais. Limiares: +-0,20% no dia,
// +-0,50% na semana e +-R$ 0,02 na mediana do Focus em 4 semanas.
function sinais(dias: DiaPtax[], projecoes: Focus[]): Sinal[] {
  const out: Sinal[] = [];
  const comDados = dias.filter((d) => d.boletins.length);
  const ultimo = comDados.at(-1);
  const fechados = comDados.filter((d) => d.fechamento !== null);
  if (ultimo) {
    const ultimoValor = ultimo.boletins.at(-1)!.venda;
    // Fechamento anterior: o do dia util anterior ao ultimo dia com boletins.
    const anterior = fechados.filter((d) => d.data < ultimo.data).at(-1);
    if (anterior?.fechamento) {
      const v = pct(ultimoValor, anterior.fechamento);
      out.push({
        nome: "PTAX no dia",
        direcao: v > 0.2 ? "ALTA" : v < -0.2 ? "QUEDA" : "ESTAVEL",
        detalhe: `${ultimo.boletins.at(-1)!.tipo} de ${ultimo.data.split("-").reverse().join("/")} ${fmtR(ultimoValor)} x fechamento anterior ${fmtR(anterior.fechamento)} (${fmtPct(v)})`,
      });
    }
  }
  if (fechados.length >= 6) {
    const a = fechados.at(-1)!;
    const b = fechados.at(-6)!;
    const v = pct(a.fechamento!, b.fechamento!);
    out.push({
      nome: "PTAX em 5 pregoes",
      direcao: v > 0.5 ? "ALTA" : v < -0.5 ? "QUEDA" : "ESTAVEL",
      detalhe: `${fmtR(a.fechamento!)} x ${fmtR(b.fechamento!)} em ${b.data.split("-").reverse().join("/")} (${fmtPct(v)})`,
    });
  } else out.push({ nome: "PTAX em 5 pregoes", direcao: "SEM DADO", detalhe: "Menos de 6 fechamentos no periodo." });
  const f = projecoes[0];
  if (f && f.medianaAnterior !== null) {
    const d = f.mediana - f.medianaAnterior;
    out.push({
      nome: `Focus (dolar fim de ${f.ano})`,
      direcao: d > 0.02 ? "ALTA" : d < -0.02 ? "QUEDA" : "ESTAVEL",
      detalhe: `Mediana ${fmtR(f.mediana)} em ${f.data.split("-").reverse().join("/")} x ${fmtR(f.medianaAnterior)} 4 semanas antes`,
    });
  } else out.push({ nome: "Focus", direcao: "SEM DADO", detalhe: "Sem projecao disponivel." });
  return out;
}

async function buscarCambio() {
  const [p, f, a] = await Promise.allSettled([ptax(), focus(), atuacoes()]);
  const dias = p.status === "fulfilled" ? p.value : [];
  const projecoes = f.status === "fulfilled" ? f.value : [];
  const atu = a.status === "fulfilled" ? a.value : { lista: [], ate: null };
  return {
    dias,
    projecoes,
    atuacoes: atu.lista,
    atuacoesAte: atu.ate,
    sinais: sinais(dias, projecoes),
    falhas: [
      p.status === "rejected" ? "PTAX" : null,
      f.status === "rejected" ? "Focus" : null,
      a.status === "rejected" ? "Atuacoes do BCB" : null,
    ].filter((x): x is string => x !== null),
    buscadoEm: new Date().toISOString(),
  };
}

export type PainelCambio = Awaited<ReturnType<typeof buscarCambio>>;

export { buscarCambio };

export const getPainelCambio = unstable_cache(buscarCambio, [CAMBIO_TAG], {
  revalidate: CAMBIO_REVALIDAR_SEGUNDOS,
  tags: [CAMBIO_TAG],
});
