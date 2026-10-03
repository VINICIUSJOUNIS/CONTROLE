// Aba DASHBOARD da planilha: posicao em sacas (NAYME) e LONG x SHORT DOLAR,
// calculados a partir dos lancamentos das outras abas.
// Correcoes em relacao a planilha (ver comentarios em cada linha):
// - NET GERAL = SUM(B12:B13) somava o sintetico duas vezes;
// - "bolsa set/25", "PRE FIXACAO SINTETICO" e "POSICAO B3" eram numeros
//   digitados (0) - agora sao calculados/parametro;
// - PRE-FIXACAO usava o preco medio de venda ME (com diferencial); agora usa NY atual;
// - juros do ACC entram no lado do dolar;
// - Med_dolar (cotacao "dados de acoes" quebrada, #VALUE!) virou o parametro
//   dolar do dia (PTAX); as referencias a planilhas externas [1] e [2]
//   (RELATORIO HEDGE NAYME 2023 / 28-04-2025) foram trocadas pelas abas daqui.
import {
  aFixarSaldo,
  bolsaSacas,
  Ctx,
  Dados,
  endivJuros,
  endivSaldo,
  estoqueMovimento,
  LB_SACA,
  meTotal,
  n0,
  num,
  travaSaldo,
  txt,
} from "@/lib/hedge-cambial/config";

export type LinhaDashboard = { label: string; valor: number | null; aba?: string; ajuda?: string };

export type Dashboard = {
  sacas: LinhaDashboard[];
  netSacas: number;
  dolar: LinhaDashboard[];
  netDolar: number;
  precos: LinhaDashboard[];
};

const soma = (rows: Dados[], f: (d: Dados) => number | null) => rows.reduce((s, d) => s + (f(d) ?? 0), 0);
const com = (rows: Dados[], key: string, valor: string) => rows.filter((d) => txt(d, key) === valor);
const sem = (rows: Dados[], key: string, valor: string) => rows.filter((d) => txt(d, key) !== valor);

export function calcularDashboard(abas: Record<string, Dados[]>, ctx: Ctx, posicaoB3Usd: number | null): Dashboard {
  const r = (slug: string) => abas[slug] ?? [];

  const estoque = soma(r("estoque-cafe-nayme"), estoqueMovimento);
  // Planilha: SUM(B) - SUMIF(O,"ENTREGUE",B) = sacas ainda nao entregues
  const comprasR = soma(sem(r("compras-em-reais-nayme"), "status", "ENTREGUE"), (d) => num(d, "sacas"));
  // Planilha: SUM(B) - SUMIF(J,"LIQUIDADO",B)
  const comprasFut = soma(sem(r("compras-futuras"), "status", "LIQUIDADO"), (d) => num(d, "sacas"));
  // Planilha: SUMIF(O,"A FIXAR",D)
  const aFixar = soma(com(r("cafes-a-fixar-nayme"), "status", "A FIXAR"), aFixarSaldo);
  // Planilha: -SUM(B) + SUMIF(O,"EMBARCADO",B) = -(nao embarcadas)
  const vendaMi = -soma(sem(r("venda-mi"), "status", "EMBARCADO"), (d) => num(d, "sacas"));
  // Planilha: -SUMIF(S,"FIXADO",B)
  const vendasMe = r("vendas-merc-externo-nayme");
  const vendaMeSacas = -soma(com(vendasMe, "status", "FIXADO"), (d) => num(d, "quant"));
  // Planilha: -SUM(B) + SUMIF(J,"LIQUIDADO",B)
  const vendaFut = -soma(sem(r("vendas-futuras"), "status", "LIQUIDADO"), (d) => num(d, "sacas"));
  // Planilha: SUM(C) da BOLSA NY
  const bolsa = soma(r("bolsa-ny-nayme"), bolsaSacas);
  // Planilha: SUM(C) do SINTETICO
  const sintetico = soma(r("sintetico-em-reais-bancos"), (d) => num(d, "sacas"));

  const sacas: LinhaDashboard[] = [
    { label: "ESTOQUE", valor: estoque, aba: "estoque-cafe-nayme" },
    { label: "COMPRAS EM R$", valor: comprasR, aba: "compras-em-reais-nayme", ajuda: "Compradas e ainda nao entregues." },
    { label: "COMPRAS FUTURA", valor: comprasFut, aba: "compras-futuras", ajuda: "Nao liquidadas." },
    { label: "CAFES A FIXAR", valor: aFixar, aba: "cafes-a-fixar-nayme", ajuda: "Saldo a fixar (status A FIXAR)." },
    { label: "VENDA MI", valor: vendaMi, aba: "venda-mi", ajuda: "Vendas ainda nao embarcadas." },
    { label: "VENDA ME USD", valor: vendaMeSacas, aba: "vendas-merc-externo-nayme", ajuda: "Vendas externas com status FIXADO." },
    { label: "VENDA FUTURA", valor: vendaFut, aba: "vendas-futuras", ajuda: "Nao liquidadas." },
    { label: "BOLSA NY", valor: bolsa, aba: "bolsa-ny-nayme" },
    { label: "SINTETICO EM REAIS", valor: sintetico, aba: "sintetico-em-reais-bancos" },
  ];
  // Planilha: NET = SUM(B4:B12) e NET GERAL = SUM(B12:B13) (sintetico em dobro).
  const netSacas = sacas.reduce((s, l) => s + (l.valor ?? 0), 0);

  // ----- LONG X SHORT DOLAR -----
  const endiv = r("endividamento-nayme");
  const acc = soma(endiv, endivSaldo); // Planilha: SUM(L:L)
  const jurosAcc = soma(endiv, (d) => endivJuros(d, ctx));
  // Planilha: SUMIF PORTO + CLIENTE + FINANCIADO + PAGO - SUMIF("-LIQUIDADO")
  // (o ultimo nunca casava - removido).
  const clientePorto = ["PORTO", "CLIENTE", "FINANCIADO", "PAGO"].reduce(
    (s, st) => s + soma(com(vendasMe, "status", st), meTotal),
    0
  );
  const vendasFixadasUsd = soma(com(vendasMe, "status", "FIXADO"), meTotal);
  const ndf = soma(r("trava-ndf-us-nayme"), travaSaldo); // Planilha: SUM(E2:E9990)

  // Preco medio de venda (US$/saca) das vendas FIXADAS: J1/H1 da aba ME.
  const fixadoSacas = soma(com(vendasMe, "status", "FIXADO"), (d) => num(d, "quant"));
  const precoMedioVenda = fixadoSacas ? vendasFixadasUsd / fixadoSacas : null;

  // Planilha: G8 = -(BOLSA NY sacas x preco medio de venda ME). A posicao em
  // bolsa vira dolar ao ser fixada; o valor correto e o da bolsa (NY atual
  // x 1,3228), sem o diferencial. Sem NY informado, cai no criterio da planilha.
  const precoNySaca = ctx.ny !== null ? ctx.ny * LB_SACA : precoMedioVenda;
  const preFixacao = precoNySaca === null ? null : -(bolsa * precoNySaca);
  const preFixacaoSintetico = precoNySaca === null ? null : -(sintetico * precoNySaca);

  const dolar: LinhaDashboard[] = [
    { label: "ACC", valor: acc, aba: "endividamento-nayme", ajuda: "Saldo a liquidar dos ACC." },
    { label: "JUROS ACC", valor: jurosAcc, aba: "endividamento-nayme", ajuda: "Juros acumulados ate hoje (base 360)." },
    {
      label: "CLIENTE+PORTO",
      valor: clientePorto,
      aba: "vendas-merc-externo-nayme",
      ajuda: "Vendas externas com status PORTO, CLIENTE, FINANCIADO e PAGO.",
    },
    { label: "VENDAS FIXADAS", valor: vendasFixadasUsd, aba: "vendas-merc-externo-nayme" },
    { label: "NDF/US$", valor: ndf, aba: "trava-ndf-us-nayme", ajuda: "Saldo das NDFs/travas em aberto." },
    {
      label: "PRE-FIXACAO",
      valor: preFixacao,
      aba: "bolsa-ny-nayme",
      ajuda: ctx.ny !== null ? "-(Bolsa NY em sacas x NY atual x 1,3228)." : "Sem NY atual: usando o preco medio de venda ME.",
    },
    {
      label: "PRE FIXACAO SINTETICO",
      valor: preFixacaoSintetico,
      aba: "sintetico-em-reais-bancos",
      ajuda: "-(Sintetico em sacas x NY atual x 1,3228).",
    },
    { label: "POSICAO B3", valor: posicaoB3Usd ?? 0, ajuda: "Parametro (US$) - posicao em dolar futuro na B3." },
  ];
  const netDolar = dolar.reduce((s, l) => s + (l.valor ?? 0), 0);

  // ----- Precos medios -----
  // Preco medio de venda geral (R$/saca): vendas ME com status PORTO, CLIENTE e
  // FIXADO convertidas pelo dolar do dia (planilha: mesma conta sobre a planilha externa [2]).
  const geral = vendasMe.filter((d) => ["PORTO", "CLIENTE", "FIXADO"].includes(txt(d, "status")));
  const geralSacas = soma(geral, (d) => num(d, "quant"));
  const precoGeral = ctx.dolar && geralSacas ? (soma(geral, meTotal) * ctx.dolar) / geralSacas : null;

  const compras = r("compras-em-reais-nayme");
  const comprasSacas = soma(compras, (d) => num(d, "sacas"));
  const precoCompra = comprasSacas ? soma(compras, (d) => n0(d, "sacas") * n0(d, "valorSaca")) / comprasSacas : null;
  const precoCompraCusto = precoCompra === null ? null : precoCompra * 1.015;

  const precos: LinhaDashboard[] = [
    { label: "Preco medio de venda (US$/saca)", valor: precoMedioVenda, ajuda: "Vendas externas FIXADAS." },
    { label: "Dolar do dia", valor: ctx.dolar },
    { label: "Preco medio de venda geral (R$/saca)", valor: precoGeral, ajuda: "Vendas ME PORTO + CLIENTE + FIXADO x dolar do dia." },
    { label: "Preco medio de compra (R$/saca)", valor: precoCompra, ajuda: "Todas as compras em R$." },
    {
      label: "Margem media (R$/saca)",
      valor: precoGeral !== null && precoCompra !== null ? precoGeral - precoCompra : null,
    },
    { label: "Preco medio de compra + 1,5% (R$/saca)", valor: precoCompraCusto },
    {
      label: "Media compra US$",
      valor: precoCompraCusto !== null && ctx.dolar ? precoCompraCusto / ctx.dolar : null,
      ajuda: "Preco medio de compra + 1,5% / dolar do dia.",
    },
  ];

  return { sacas, netSacas, dolar, netDolar, precos };
}
