// PTAX de fechamento (compra e venda) do Banco Central: historico diario em
// hedge_ptax e dolar do dia do modulo Hedge.
// A atualizacao e automatica: sincronizarPtax() roda quando uma tela do Hedge
// abre (no maximo a cada 15 minutos) e pelo agendamento diario da Vercel
// (/api/cron/ptax). Busca no BCB os dias que faltam desde a ultima PTAX gravada
// e, se a PTAX nova for mais recente que o dolar do dia, atualiza o parametro.
import { prisma } from "@/lib/prisma";

export type PtaxDia = { data: string; compra: number; venda: number };

const CHAVE_VERIFICADO = "ptaxVerificadoEm";
const INTERVALO_MS = 15 * 60 * 1000;

const mmddyyyy = (iso: string) => `${iso.slice(5, 7)}-${iso.slice(8, 10)}-${iso.slice(0, 4)}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

function hojeSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

async function buscarNoBcb(de: string, ate: string): Promise<PtaxDia[]> {
  const url =
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
    `?@dataInicial='${mmddyyyy(de)}'&@dataFinalCotacao='${mmddyyyy(ate)}'&$format=json&$select=cotacaoCompra,cotacaoVenda,dataHoraCotacao`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`BCB HTTP ${res.status}`);
  const json = (await res.json()) as { value: { cotacaoCompra: number; cotacaoVenda: number; dataHoraCotacao: string }[] };
  // Um registro por dia (se o BCB republicar no mesmo dia, vale o ultimo).
  const porDia = new Map<string, PtaxDia>();
  for (const v of [...json.value].sort((a, b) => a.dataHoraCotacao.localeCompare(b.dataHoraCotacao))) {
    porDia.set(v.dataHoraCotacao.slice(0, 10), { data: v.dataHoraCotacao.slice(0, 10), compra: v.cotacaoCompra, venda: v.cotacaoVenda });
  }
  return Array.from(porDia.values());
}

export async function sincronizarPtax({ forcar = false } = {}): Promise<{ novos: number; ultima: string | null }> {
  if (!forcar) {
    const marca = await prisma.hedgeParametro.findUnique({ where: { chave: CHAVE_VERIFICADO } });
    if (marca && Date.now() - new Date(marca.valor).getTime() < INTERVALO_MS) {
      const ultima = await prisma.hedgePtax.findFirst({ orderBy: { data: "desc" }, select: { data: true } });
      return { novos: 0, ultima: ultima ? iso(ultima.data) : null };
    }
  }
  await prisma.hedgeParametro.upsert({
    where: { chave: CHAVE_VERIFICADO },
    create: { chave: CHAVE_VERIFICADO, valor: new Date().toISOString() },
    update: { valor: new Date().toISOString() },
  });

  const ultimaGravada = await prisma.hedgePtax.findFirst({ orderBy: { data: "desc" }, select: { data: true } });
  const hoje = hojeSaoPaulo();
  // Busca desde o dia da ultima PTAX gravada (rebusca esse dia para pegar
  // eventual correcao) ate hoje; sem historico, os ultimos 30 dias.
  const de = ultimaGravada ? iso(ultimaGravada.data) : iso(new Date(Date.now() - 30 * 86400000));
  const dias = await buscarNoBcb(de, hoje);
  let novos = 0;
  for (const d of dias) {
    const data = new Date(`${d.data}T00:00:00.000Z`);
    const existente = await prisma.hedgePtax.findUnique({ where: { data } });
    if (!existente) novos++;
    await prisma.hedgePtax.upsert({
      where: { data },
      create: { data, compra: d.compra, venda: d.venda },
      update: { compra: d.compra, venda: d.venda },
    });
  }

  const ultima = dias.at(-1) ?? null;
  if (ultima) {
    // Atualiza o dolar do dia se a PTAX for mais nova que o dolar gravado
    // (um dolar digitado na mao para o mesmo dia e mantido).
    const dataAtual = await prisma.hedgeParametro.findUnique({ where: { chave: "dolarData" } });
    if (!dataAtual?.valor || dataAtual.valor < ultima.data) {
      await prisma.$transaction([
        prisma.hedgeParametro.upsert({
          where: { chave: "dolar" },
          create: { chave: "dolar", valor: String(ultima.venda) },
          update: { valor: String(ultima.venda) },
        }),
        prisma.hedgeParametro.upsert({
          where: { chave: "dolarData" },
          create: { chave: "dolarData", valor: ultima.data },
          update: { valor: ultima.data },
        }),
      ]);
    }
  }
  return { novos, ultima: ultima?.data ?? (ultimaGravada ? iso(ultimaGravada.data) : null) };
}

// Versao que nunca derruba a tela: se o BCB estiver fora, segue com o que ha.
export async function sincronizarPtaxSilencioso() {
  try {
    await sincronizarPtax();
  } catch (e) {
    console.error("PTAX: falha ao sincronizar", e);
  }
}

export async function getHistoricoPtax(de?: string, ate?: string): Promise<PtaxDia[]> {
  const rows = await prisma.hedgePtax.findMany({
    where: {
      data: {
        ...(de ? { gte: new Date(`${de}T00:00:00.000Z`) } : {}),
        ...(ate ? { lte: new Date(`${ate}T00:00:00.000Z`) } : {}),
      },
    },
    orderBy: { data: "asc" },
  });
  return rows.map((r) => ({ data: iso(r.data), compra: Number(r.compra), venda: Number(r.venda) }));
}
