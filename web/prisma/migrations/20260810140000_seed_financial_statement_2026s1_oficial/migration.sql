-- Lancamento do Balanco Patrimonial e da DRE oficiais (assinados, enviados
-- aos bancos) do 1o semestre de 2026 (01/01/2026 a 30/06/2026, acumulado).
-- Fontes: "BALANCO_NAYME.pdf" e "DRE_NAYME_ACUMULADO.pdf" (NAYME
-- EXPORTADORA DE CAFE LTDA, CNPJ 27.404.965/0001-04, assinados
-- digitalmente em 03/08/2026).
--
-- Mesmo criterio de mapeamento do lancamento oficial de 2025 (ver migration
-- 20260810130000_seed_financial_statement_2025_oficial):
-- - receitaBruta = receitaLiquida (178.773.852), deducoes = 0 - a DRE oficial
--   nao discrimina bruta/deducoes.
-- - cmv = "Custo dos produtos vendidos" (171.510.783), exatamente como no
--   documento. lucroBruto (campo do schema) = receitaLiquida - cmv =
--   7.263.069, diferente do "Lucro bruto" impresso (7.017.466) porque o
--   documento embute a Variacao ativa/passiva ANTES do lucro bruto; aqui ela
--   vai no campo variacaoCambial, DEPOIS do resultado da atividade (mesma
--   convencao do lancamento anterior). O total bate: resultadoAtividade
--   (1.664.804) + receitasFinanceiras - despesasFinanceiras + variacaoCambial
--   (-245.604) - impostoRenda = -1.681.858 ~= "Lucro do exercicio" impresso
--   (-1.681.857), diferenca de R$1 por arredondamento em cascata.
-- - variacaoCambial = "Variacao ativa" (10.170.064) - "Variacao passiva"
--   (10.415.668) = -245.604.
-- - lucrosPrejuizosAcumulados = "Lucros/Prejuizos acumulados" (3.378.580) +
--   "Resultado do exercicio" (-1.681.857) = 1.696.723 - schema nao tem campo
--   separado pro resultado do exercicio ainda nao apropriado.
-- - Adiantamentos (283.136) -> adiantamentoFornecedores; Tributos a
--   recuperar (1.057.755) -> outrosAtivosOperacionaisCirc; Partes
--   relacionadas (1.501.838) -> contasReceberColigadas; Consorcio (304.749)
--   -> outrosAtivosNaoCirculantes; Tributos a recolher (588.942) ->
--   impostosContribuicoes.
-- - Sem discriminacao de moeda estrangeira no documento -> NULL.
--
-- Conferido campo a campo: Ativo Circulante (53.630.703), Ativo Nao
-- Circulante (4.712.197), Total do Ativo (58.342.900), Passivo Circulante
-- (55.846.177) e Patrimonio Liquido (2.496.723) batem exatos com os totais
-- impressos no documento.

INSERT INTO "financial_statements" ("id", "periodLabel", "referenceDate", "periodDays", "sourceFileName", "receitaBruta", "deducoes", "receitaLiquida", "cmv", "lucroBruto", "outrasReceitasOperacionais", "despesasGerais", "despesasComerciais", "despesasTributarias", "depreciacaoAmortizacao", "outrasDespesasOperacionais", "resultadoAtividade", "receitasFinanceiras", "despesasFinanceiras", "variacaoCambial", "resultadoNaoOperacional", "impostoRenda", "participacoes", "lucroLiquido", "caixaEquivalentes", "titulosValoresMobiliarios", "contasReceberClientes", "estoques", "adiantamentoFornecedores", "outrosAtivosOperacionaisCirc", "outrosAtivosNaoOperacionaisCirc", "contasReceberColigadas", "investimentos", "imobilizado", "intangivel", "outrosAtivosNaoCirculantes", "fornecedores", "salariosEncargos", "impostosContribuicoes", "emprestimosCurtoPrazo", "irAPagar", "emprestimosColigadasCP", "dividendosAPagar", "adiantamentosClientes", "outrosPassivosCirc", "emprestimosLongoPrazo", "outrosPassivosNaoCirc", "capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes", "ativosMoedaEstrangeira", "passivosMoedaEstrangeira", "extractedRaw", "aiInsights", "createdAt", "updatedAt") VALUES
('d86e1e5e-9f14-4f72-92b6-279adccb9e7f', '2026 S1', '2026-06-30', 181, 'BALANCO_NAYME.pdf / DRE_NAYME_ACUMULADO.pdf', 178773852.00, 0.00, 178773852.00, 171510783.00, 7263069.00, 420816.00, 6019081.00, 0.00, 0.00, 0.00, 0.00, 1664804.00, 275643.00, 2795723.00, -245604.00, 0.00, 580978.00, 0.00, -1681857.00, 7943259.00, 0.00, 29451660.00, 14894893.00, 283136.00, 1057755.00, 0.00, 1501838.00, 0.00, 2905610.00, 0.00, 304749.00, 14718374.00, 104210.00, 588942.00, 39806074.00, 0.00, 0.00, 0.00, 628577.00, 0.00, 0.00, 0.00, 800000.00, 0.00, 1696723.00, 0.00, NULL, NULL, '{"periodLabel":"2026 S1","referenceDate":"2026-06-30","periodDays":181,"sourceFileName":"BALANCO_NAYME.pdf / DRE_NAYME_ACUMULADO.pdf","receitaBruta":178773852,"deducoes":0,"receitaLiquida":178773852,"cmv":171510783,"lucroBruto":7263069,"outrasReceitasOperacionais":420816,"despesasGerais":6019081,"despesasComerciais":0,"despesasTributarias":0,"depreciacaoAmortizacao":0,"outrasDespesasOperacionais":0,"resultadoAtividade":1664804,"receitasFinanceiras":275643,"despesasFinanceiras":2795723,"variacaoCambial":-245604,"resultadoNaoOperacional":0,"impostoRenda":580978,"participacoes":0,"lucroLiquido":-1681857,"caixaEquivalentes":7943259,"titulosValoresMobiliarios":0,"contasReceberClientes":29451660,"estoques":14894893,"adiantamentoFornecedores":283136,"outrosAtivosOperacionaisCirc":1057755,"outrosAtivosNaoOperacionaisCirc":0,"contasReceberColigadas":1501838,"investimentos":0,"imobilizado":2905610,"intangivel":0,"outrosAtivosNaoCirculantes":304749,"fornecedores":14718374,"salariosEncargos":104210,"impostosContribuicoes":588942,"emprestimosCurtoPrazo":39806074,"irAPagar":0,"emprestimosColigadasCP":0,"dividendosAPagar":0,"adiantamentosClientes":628577,"outrosPassivosCirc":0,"emprestimosLongoPrazo":0,"outrosPassivosNaoCirc":0,"capitalSocial":800000,"reservas":0,"lucrosPrejuizosAcumulados":1696723,"outrosResultadosAbrangentes":0,"ativosMoedaEstrangeira":null,"passivosMoedaEstrangeira":null}'::jsonb, NULL, '2026-08-10T14:00:00.000Z', '2026-08-10T14:00:00.000Z')
ON CONFLICT ("referenceDate") DO UPDATE SET
"periodLabel" = EXCLUDED."periodLabel",
"periodDays" = EXCLUDED."periodDays",
"sourceFileName" = EXCLUDED."sourceFileName",
"receitaBruta" = EXCLUDED."receitaBruta",
"deducoes" = EXCLUDED."deducoes",
"receitaLiquida" = EXCLUDED."receitaLiquida",
"cmv" = EXCLUDED."cmv",
"lucroBruto" = EXCLUDED."lucroBruto",
"outrasReceitasOperacionais" = EXCLUDED."outrasReceitasOperacionais",
"despesasGerais" = EXCLUDED."despesasGerais",
"despesasComerciais" = EXCLUDED."despesasComerciais",
"despesasTributarias" = EXCLUDED."despesasTributarias",
"depreciacaoAmortizacao" = EXCLUDED."depreciacaoAmortizacao",
"outrasDespesasOperacionais" = EXCLUDED."outrasDespesasOperacionais",
"resultadoAtividade" = EXCLUDED."resultadoAtividade",
"receitasFinanceiras" = EXCLUDED."receitasFinanceiras",
"despesasFinanceiras" = EXCLUDED."despesasFinanceiras",
"variacaoCambial" = EXCLUDED."variacaoCambial",
"resultadoNaoOperacional" = EXCLUDED."resultadoNaoOperacional",
"impostoRenda" = EXCLUDED."impostoRenda",
"participacoes" = EXCLUDED."participacoes",
"lucroLiquido" = EXCLUDED."lucroLiquido",
"caixaEquivalentes" = EXCLUDED."caixaEquivalentes",
"titulosValoresMobiliarios" = EXCLUDED."titulosValoresMobiliarios",
"contasReceberClientes" = EXCLUDED."contasReceberClientes",
"estoques" = EXCLUDED."estoques",
"adiantamentoFornecedores" = EXCLUDED."adiantamentoFornecedores",
"outrosAtivosOperacionaisCirc" = EXCLUDED."outrosAtivosOperacionaisCirc",
"outrosAtivosNaoOperacionaisCirc" = EXCLUDED."outrosAtivosNaoOperacionaisCirc",
"contasReceberColigadas" = EXCLUDED."contasReceberColigadas",
"investimentos" = EXCLUDED."investimentos",
"imobilizado" = EXCLUDED."imobilizado",
"intangivel" = EXCLUDED."intangivel",
"outrosAtivosNaoCirculantes" = EXCLUDED."outrosAtivosNaoCirculantes",
"fornecedores" = EXCLUDED."fornecedores",
"salariosEncargos" = EXCLUDED."salariosEncargos",
"impostosContribuicoes" = EXCLUDED."impostosContribuicoes",
"emprestimosCurtoPrazo" = EXCLUDED."emprestimosCurtoPrazo",
"irAPagar" = EXCLUDED."irAPagar",
"emprestimosColigadasCP" = EXCLUDED."emprestimosColigadasCP",
"dividendosAPagar" = EXCLUDED."dividendosAPagar",
"adiantamentosClientes" = EXCLUDED."adiantamentosClientes",
"outrosPassivosCirc" = EXCLUDED."outrosPassivosCirc",
"emprestimosLongoPrazo" = EXCLUDED."emprestimosLongoPrazo",
"outrosPassivosNaoCirc" = EXCLUDED."outrosPassivosNaoCirc",
"capitalSocial" = EXCLUDED."capitalSocial",
"reservas" = EXCLUDED."reservas",
"lucrosPrejuizosAcumulados" = EXCLUDED."lucrosPrejuizosAcumulados",
"outrosResultadosAbrangentes" = EXCLUDED."outrosResultadosAbrangentes",
"ativosMoedaEstrangeira" = EXCLUDED."ativosMoedaEstrangeira",
"passivosMoedaEstrangeira" = EXCLUDED."passivosMoedaEstrangeira",
"extractedRaw" = EXCLUDED."extractedRaw",
"aiInsights" = EXCLUDED."aiInsights",
"updatedAt" = EXCLUDED."updatedAt";
