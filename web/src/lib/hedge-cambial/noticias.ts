// Ultimas noticias do mercado de dolar, lidas dos feeds RSS publicos dos
// portais abaixo. O resultado fica em cache por 30 minutos (tag NOTICIAS_TAG);
// a tela busca de novo sozinha quando completa 30 minutos e o botao
// "Atualizar agora" forca uma busca nova na hora (ver atualizarNoticias).
// Noticias de cafe ficaram de fora: os feeds gratuitos publicam com dias de
// atraso, o que nao serve para decisao de mercado.
import { unstable_cache } from "next/cache";

export const NOTICIAS_REVALIDAR_SEGUNDOS = 30 * 60;
export const NOTICIAS_TAG = "hedge-noticias";
const QUANTIDADE = 10;

export type Noticia = {
  titulo: string;
  link: string;
  fonte: string;
  data: string | null; // ISO
  resumo: string;
};

type Feed = { fonte: string; url: string };

/** Resultado da leitura de cada feed na ultima busca (mostrado na tela). */
export type StatusFonte = { fonte: string; url: string; ok: boolean; erro?: string };

const FEEDS_DOLAR: Feed[] = [
  { fonte: "Valor Economico", url: "https://valor.globo.com/rss/valor/" },
  { fonte: "Money Times", url: "https://www.moneytimes.com.br/tag/dolar/feed/" },
  { fonte: "InfoMoney", url: "https://www.infomoney.com.br/tudo-sobre/dolar/feed/" },
  { fonte: "Investing.com", url: "https://br.investing.com/rss/news_1.rss" },
];

// Os feeds trazem tambem outros assuntos (bolsa, juros, outras moedas): so
// entram as noticias com o dolar/cambio no titulo.
const FILTRO_DOLAR = /d[óo]lar|c[âa]mbio|ptax/i;

// Cabecalhos de navegador: alguns portais recusam pedidos sem eles.
const CABECALHOS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

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

// Baixa o feed com ate 2 tentativas.
async function baixar(url: string): Promise<{ xml?: string; erro?: string }> {
  let erro = "";
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const res = await fetch(url, {
        headers: CABECALHOS,
        cache: "no-store", // o cache e do conjunto (unstable_cache abaixo), nao de cada feed
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { xml: await res.text() };
      erro = `HTTP ${res.status}`;
    } catch (e) {
      erro = e instanceof Error && e.name === "TimeoutError" ? "sem resposta (10s)" : "falha de conexao";
    }
  }
  return { erro };
}

async function lerFeed(feed: Feed): Promise<{ noticias: Noticia[]; status: StatusFonte }> {
  const r = await baixar(feed.url);
  if (r.xml === undefined) return { noticias: [], status: { ...feed, ok: false, erro: r.erro } };
  const itens = r.xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const noticias = itens
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
    .filter((n) => n.titulo && /^https?:\/\//.test(n.link) && FILTRO_DOLAR.test(n.titulo));
  return { noticias, status: { ...feed, ok: true } };
}

export async function buscarNoticias() {
  const lidos = await Promise.all(FEEDS_DOLAR.map(lerFeed));
  const vistos = new Set<string>();
  const dolar = lidos
    .flatMap((l) => l.noticias)
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
    .filter((n) => {
      const chave = n.titulo.toLowerCase();
      if (vistos.has(chave) || vistos.has(n.link)) return false;
      vistos.add(chave);
      vistos.add(n.link);
      return true;
    })
    .slice(0, QUANTIDADE);
  // buscadoEm fica no cache junto com as noticias: e a hora real da busca.
  return { dolar, fontes: lidos.map((l) => l.status), buscadoEm: new Date().toISOString() };
}

export const getUltimasNoticias = unstable_cache(buscarNoticias, [NOTICIAS_TAG], {
  revalidate: NOTICIAS_REVALIDAR_SEGUNDOS,
  tags: [NOTICIAS_TAG],
});
