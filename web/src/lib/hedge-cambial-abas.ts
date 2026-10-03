// Abas da planilha PLANILHA_HEDGE_NAYME, na mesma ordem e com os mesmos titulos.
// A aba DASHBOARD corresponde ao item "Dashboard Hedge" (/hedge-cambial).
export const hedgeCambialAbas = [
  { slug: "sintetico-em-reais-bancos", label: "SINTETICO EM REAIS - BANCOS" },
  { slug: "trava-ndf-us-nayme", label: "TRAVA NDF US$ NAYME" },
  { slug: "estoque-cafe-nayme", label: "ESTOQUE CAFE NAYME" },
  { slug: "venda-mi", label: "VENDA MI" },
  { slug: "vendas-merc-externo-nayme", label: "VENDAS MERC. EXTERNO NAYME" },
  { slug: "bolsa-ny-nayme", label: "BOLSA NY - NAYME" },
  { slug: "compras-em-reais-nayme", label: "COMPRAS EM R$ - NAYME" },
  { slug: "cafes-a-fixar-nayme", label: "CAFES A FIXAR - NAYME" },
  { slug: "endividamento-nayme", label: "ENDIVIDAMENTO NAYME" },
  { slug: "compras-futuras", label: "COMPRAS FUTURAS" },
  { slug: "vendas-futuras", label: "VENDAS FUTURAS" },
  { slug: "resumo-trades", label: "RESUMO TRADES" },
  { slug: "lote-especial", label: "LOTE ESPECIAL" },
  { slug: "liquidez", label: "LIQUIDEZ" },
  { slug: "net-qualidade", label: "NET QUALIDADE" },
] as const;

export function getHedgeCambialAba(slug: string) {
  return hedgeCambialAbas.find((a) => a.slug === slug);
}
