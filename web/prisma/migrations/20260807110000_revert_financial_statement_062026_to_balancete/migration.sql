-- Reverte o registro de 30/06/2026 na Analise de Credito de volta para os
-- valores do balancete bruto (Balancete_nayme_062026.pdf), desfazendo a
-- substituicao pelo Balanco/DRE oficial feita na migration
-- 20260807100000_replace_financial_statement_062026_oficial. A pedido do
-- usuario: considerar somente o balancete, excluindo balanco e DRE oficiais
-- desta analise.
--
-- Valores identicos aos da migration original 20260807090000_seed_financial_statement_062026
-- (ver aquela migration para o detalhamento do mapeamento conta-a-conta).

INSERT INTO "financial_statements" ("id", "periodLabel", "referenceDate", "periodDays", "sourceFileName", "receitaBruta", "deducoes", "receitaLiquida", "cmv", "lucroBruto", "outrasReceitasOperacionais", "despesasGerais", "despesasComerciais", "despesasTributarias", "depreciacaoAmortizacao", "outrasDespesasOperacionais", "resultadoAtividade", "receitasFinanceiras", "despesasFinanceiras", "variacaoCambial", "resultadoNaoOperacional", "impostoRenda", "participacoes", "lucroLiquido", "caixaEquivalentes", "titulosValoresMobiliarios", "contasReceberClientes", "estoques", "adiantamentoFornecedores", "outrosAtivosOperacionaisCirc", "outrosAtivosNaoOperacionaisCirc", "contasReceberColigadas", "investimentos", "imobilizado", "intangivel", "outrosAtivosNaoCirculantes", "fornecedores", "salariosEncargos", "impostosContribuicoes", "emprestimosCurtoPrazo", "irAPagar", "emprestimosColigadasCP", "dividendosAPagar", "adiantamentosClientes", "outrosPassivosCirc", "emprestimosLongoPrazo", "outrosPassivosNaoCirc", "capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes", "ativosMoedaEstrangeira", "passivosMoedaEstrangeira", "extractedRaw", "aiInsights", "createdAt", "updatedAt") VALUES
('cbc002c0-4773-464e-8dc0-e15a049fe54f', '2026 S1', '2026-06-30', 181, 'Balancete_nayme_062026.pdf', 113134689.94, 3352848.73, 109781841.21, 101531141.64, 8250699.57, 275777.06, 1200501.81, 2240358.41, 8871.41, 64027.78, 0.00, 5012717.22, 159626.05, 1252113.08, 871125.78, 0.00, 0.00, 0.00, 4791355.97, 6704264.21, 0.00, 37875648.95, 14894892.81, 6023256.96, 2296749.82, 0.00, 4110446.40, 0.00, 2905610.44, 0.00, 0.00, 28597542.63, 104209.71, 7963.90, 39879609.46, 0.00, 0.00, 0.00, 628577.07, 0.00, 0.00, 0.00, 800000.00, 0.00, 4792966.82, 0.00, 18562620.29, 30068724.79, '{"periodLabel":"2026 S1","referenceDate":"2026-06-30","periodDays":181,"sourceFileName":"Balancete_nayme_062026.pdf","receitaBruta":113134689.94,"deducoes":3352848.73,"receitaLiquida":109781841.21,"cmv":101531141.64,"lucroBruto":8250699.57,"outrasReceitasOperacionais":275777.06,"despesasGerais":1200501.81,"despesasComerciais":2240358.41,"despesasTributarias":8871.41,"depreciacaoAmortizacao":64027.78,"outrasDespesasOperacionais":0,"resultadoAtividade":5012717.22,"receitasFinanceiras":159626.05,"despesasFinanceiras":1252113.08,"variacaoCambial":871125.78,"resultadoNaoOperacional":0,"impostoRenda":0,"participacoes":0,"lucroLiquido":4791355.97,"caixaEquivalentes":6704264.21,"titulosValoresMobiliarios":0,"contasReceberClientes":37875648.95,"estoques":14894892.81,"adiantamentoFornecedores":6023256.96,"outrosAtivosOperacionaisCirc":2296749.82,"outrosAtivosNaoOperacionaisCirc":0,"contasReceberColigadas":4110446.4,"investimentos":0,"imobilizado":2905610.44,"intangivel":0,"outrosAtivosNaoCirculantes":0,"fornecedores":28597542.63,"salariosEncargos":104209.71,"impostosContribuicoes":7963.9,"emprestimosCurtoPrazo":39879609.46,"irAPagar":0,"emprestimosColigadasCP":0,"dividendosAPagar":0,"adiantamentosClientes":628577.07,"outrosPassivosCirc":0,"emprestimosLongoPrazo":0,"outrosPassivosNaoCirc":0,"capitalSocial":800000,"reservas":0,"lucrosPrejuizosAcumulados":4792966.82,"outrosResultadosAbrangentes":0,"ativosMoedaEstrangeira":18562620.29,"passivosMoedaEstrangeira":30068724.79}'::jsonb, NULL, '2026-08-07T17:42:04.233Z', '2026-08-07T17:42:04.233Z')
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
