// Ultimas noticias do mercado de dolar e de cafe, lidas dos feeds RSS publicos
// dos portais abaixo. Cada feed fica em cache por 30 minutos (o sistema busca
// de novo depois disso); a tela tambem se atualiza sozinha a cada 30 minutos.

export const NOTICIAS_REVALIDAR_SEGUNDOS = 30 * 60;
const QUANTIDADE = 10;

export type Noticia = {
  titulo: string;
  link: string;
  fonte: string;
  data: string | null; // ISO
  resumo: string;
  /** So na lista de tendencia: direcao do preco do cafe na noticia. */
  tendencia?: "ALTA" | "QUEDA";
};

type Feed = { fonte: string; url: string };

const FEEDS_DOLAR: Feed[] = [
  { fonte: "Money Times", url: "https://www.moneytimes.com.br/tag/dolar/feed/" },
  { fonte: "InfoMoney", url: "https://www.infomoney.com.br/tudo-sobre/dolar/feed/" },
  { fonte: "Investing.com", url: "https://br.investing.com/rss/news_1.rss" },
];

const FEEDS_CAFE: Feed[] = [
  { fonte: "Money Times", url: "https://www.moneytimes.com.br/tag/cafe/feed/" },
  { fonte: "Canal Rural", url: "https://www.canalrural.com.br/agricultura/cafe/feed/" },
  { fonte: "InfoMoney", url: "https://www.infomoney.com.br/tudo-sobre/cafe/feed/" },
  { fonte: "Investing.com", url: "https://br.investing.com/rss/news_11.rss" },
];

// Noticias de preco do cafe (bolsa de NY): os feeds de cafe acima com mais
// paginas, mais o de commodities do Money Times (fechamentos dos "softs").
const FEEDS_TENDENCIA: Feed[] = [
  ...FEEDS_CAFE,
  { fonte: "Money Times", url: "https://www.moneytimes.com.br/tag/commodities/feed/" },
  { fonte: "Canal Rural", url: "https://www.canalrural.com.br/agricultura/cafe/feed/?paged=2" },
  { fonte: "Canal Rural", url: "https://www.canalrural.com.br/agricultura/cafe/feed/?paged=3" },
  { fonte: "Canal Rural", url: "https://www.canalrural.com.br/agricultura/cafe/feed/?paged=4" },
  { fonte: "Canal Rural", url: "https://www.canalrural.com.br/agricultura/cafe/feed/?paged=5" },
  { fonte: "InfoMoney", url: "https://www.infomoney.com.br/tudo-sobre/cafe/feed/?paged=2" },
  { fonte: "InfoMoney", url: "https://www.infomoney.com.br/tudo-sobre/cafe/feed/?paged=3" },
];

// Os feeds trazem tambem outros assuntos (bolsa, petroleo, soja, lojas,
// lancamentos de produtos...): so entram as noticias com o tema no titulo e,
// no cafe, ligadas ao mercado (preco, safra, clima, exportacao...).
const FILTRO_DOLAR = (n: Noticia) => /d[óo]lar|c[âa]mbio|ptax/i.test(n.titulo);
const FILTRO_CAFE = (n: Noticia) =>
  CAFE_TITULO.test(n.titulo) &&
  (CONTEXTO_PRECO.test(n.titulo) ||
    /safra|exporta|colheita|produ[çc][ãa]o|produtor|florada|clima|chuva|seca|geada|el ni|estoque|oferta|demanda|consumo|cepea|conab|usda|tarifa/i.test(
      n.titulo
    ));

function decodificar(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, nome: string) {
  const m = item.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`, "i"));
  return m ? decodificar(m[1]) : "";
}

function lerData(s: string): string | null {
  if (!s) return null;
  // Investing.com usa "2026-10-03 08:46:20" (UTC); os demais, RFC 822.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? s.replace(" ", "T") + "Z" : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function lerFeed(feed: Feed, filtro: RegExp | ((n: Noticia) => boolean)): Promise<Noticia[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ControleNayme/1.0)" },
      next: { revalidate: NOTICIAS_REVALIDAR_SEGUNDOS },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const itens = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
    return itens
      .map((item) => {
        const resumo = tag(item, "description");
        return {
          titulo: tag(item, "title"),
          link: tag(item, "link"),
          fonte: feed.fonte,
          data: lerData(tag(item, "pubDate")),
          resumo: resumo.length > 220 ? resumo.slice(0, 217).trimEnd() + "..." : resumo,
        };
      })
      .filter(
        (n) =>
          n.titulo &&
          /^https?:\/\//.test(n.link) &&
          (typeof filtro === "function" ? filtro(n) : filtro.test(`${n.titulo} ${n.resumo}`))
      );
  } catch {
    return [];
  }
}

async function ultimas(feeds: Feed[], filtro: RegExp | ((n: Noticia) => boolean)) {
  const listas = await Promise.all(feeds.map((f) => lerFeed(f, filtro)));
  const vistos = new Set<string>();
  return listas
    .flat()
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
    .filter((n) => {
      const chave = n.titulo.toLowerCase();
      if (vistos.has(chave) || vistos.has(n.link)) return false;
      vistos.add(chave);
      vistos.add(n.link);
      return true;
    })
    .slice(0, QUANTIDADE);
}

// ---- Tendencia do preco do cafe ----
// Titulos como "Acucar recua apos maxima, enquanto cafe se aproxima da menor
// cotacao" falam de varios produtos: a direcao e lida so no trecho do titulo
// que fala do cafe.
// Limite de palavra que aceita acentos (o \b do JavaScript trata "ç" e "á" como separador).
const palavras = (lista: string) => new RegExp(`(?<![a-zà-ú])(${lista})(?![a-zà-ú])`, "i");
const ALTA = palavras("alta|altas|sobe|sobem|subiu|subiram|avan[çc]a|avan[çc]am|avan[çc]ou|dispara|disparam|disparou|salta|saltam|valoriza|valorizam|valorizou|m[áa]xima|recupera|recuperam|ganho|ganhos|rali|firme|firmes");
const QUEDA = palavras("queda|quedas|cai|caem|caiu|ca[íi]ram|recua|recuam|recuou|despenca|despencam|desvaloriza|desvalorizam|m[íi]nima|perde|perdem|perdas|baixa|baixas|menor cota[çc][ãa]o|press[ãa]o");
const CAFE_TITULO = /caf[ée]|ar[áa]bica|robusta|conilon/i;
// Contexto de preco/bolsa: evita "exportacoes de cafe caem" ou "colheita avanca".
const CONTEXTO_PRECO = palavras("nova york|ny|bolsa|pre[çc]os?|cota[çc][ãa]o|cota[çc][õo]es|ar[áa]bica|robusta|conilon|cepea|ice|sacas?|contratos?|futuros?|semana|semanal|semanais|sess[ãa]o|fecha|mercado");
const FORA_DO_PRECO = /exporta|colheita|safra|consumo|florada|fertilizante|curso|tarifa|embarque/i;

function trechoDoCafe(titulo: string) {
  const partes = titulo.split(/[,;:]| enquanto | e o | mas /i);
  return partes.find((p) => CAFE_TITULO.test(p)) ?? titulo;
}

export function classificarTendencia(titulo: string): "ALTA" | "QUEDA" | null {
  if (!CAFE_TITULO.test(titulo) || !CONTEXTO_PRECO.test(titulo)) return null;
  const trecho = trechoDoCafe(titulo).replace(/alta qualidade|baixa qualidade/gi, "");
  if (FORA_DO_PRECO.test(trecho) && !/pre[çc]o|cota[çc]/i.test(trecho)) return null;
  const alta = ALTA.test(trecho);
  const queda = QUEDA.test(trecho);
  if (alta === queda) return null; // sem direcao clara (ou as duas): fica de fora
  return alta ? "ALTA" : "QUEDA";
}

async function tendenciaCafe() {
  const lista = await ultimas(FEEDS_TENDENCIA, (n) => classificarTendencia(n.titulo) !== null);
  return lista.map((n) => ({ ...n, tendencia: classificarTendencia(n.titulo)! }));
}

export async function getUltimasNoticias() {
  const [dolar, cafe, tendencia] = await Promise.all([
    ultimas(FEEDS_DOLAR, FILTRO_DOLAR),
    ultimas(FEEDS_CAFE, FILTRO_CAFE),
    tendenciaCafe(),
  ]);
  return { dolar, cafe, tendencia, buscadoEm: new Date().toISOString() };
}
