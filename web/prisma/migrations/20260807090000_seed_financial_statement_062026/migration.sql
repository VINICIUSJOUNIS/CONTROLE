-- Importacao do balancete de 06/2026 (01/06/2026 a 30/06/2026, acumulado 1o
-- semestre 2026 - contas de resultado do balancete brasileiro so zeram no
-- fechamento do exercicio, entao "Saldo Atual" das contas 3.x/4.x ja e o
-- acumulado Jan-Jun). Fonte: Balancete_nayme_062026.pdf (NAYME EXPORTADORA
-- DE CAFE LTDA, CNPJ 27.404.965/0001-04).
--
-- Mapeamento (classificacao contabil -> campo canonico), decisoes de analista:
-- - CMV inclui ICMS diferencial de aliquota (4.1.4, dentro de "4.1 CUSTOS").
-- - Despesas Financeiras (4.2.2.06) estavam classificadas como subconta de
--   Despesas Administrativas (4.2.2) neste plano de contas - foram destacadas
--   para o campo proprio despesasFinanceiras/receitasFinanceiras, assim como
--   variacao cambial (ativa 3.1.3.02 menos passiva 4.2.2.06.000003 e
--   4.2.2.06.000019) para variacaoCambial, e depreciacao/tributos (dentro de
--   4.2.2.04 e 4.2.2.03) para depreciacaoAmortizacao/despesasTributarias -
--   para nao ficarem escondidos dentro de despesasGerais.
-- - Operacoes de Hedge (conta corrente com corretoras: Hedge Point, Marex,
--   StoneX) tratada como ativo circulante operacional (outrosAtivosOperacionaisCirc),
--   nao caixa/equivalente (nao e resgatavel a vista) nem titulo mobiliario.
-- - Socios/mutuo com terceiros/consorcio (1.2.2, ativo nao circulante) tratados
--   como contasReceberColigadas.
-- - lucrosPrejuizosAcumulados inclui o resultado do periodo ainda nao fechado
--   contabilmente (R$ 4.791.355,97 de lucro acumulado Jan-Jun, que no balancete
--   fica em "Contas de Resultado" ate o encerramento do exercicio) - sem isso
--   o Patrimonio Liquido ficaria R$ 4,79 milhoes menor do que o patrimonio real,
--   distorcendo qualquer indice de alavancagem/liquidez calculado em cima dele.
--   Ativo = Passivo + PL bate exatamente com esse ajuste (conferido abaixo).
-- - ativosMoedaEstrangeira = duplicatas a receber mercado externo (1.1.2.04);
--   passivosMoedaEstrangeira = ACC - adiantamento sobre contrato de cambio (2.1.1.06).
-- - Nao ha "2.2 Passivo Nao Circulante" no plano de contas desta empresa - todo
--   emprestimo/financiamento (inclusive ACC) esta classificado como circulante.
--
-- Conferido linha a linha contra o balancete: Ativo Circulante, Ativo Nao
-- Circulante, Ativo Total, Passivo Circulante e Lucro Liquido do periodo batem
-- exatos com os totais impressos no documento.

INSERT INTO "financial_statements" ("id", "periodLabel", "referenceDate", "periodDays", "sourceFileName", "receitaBruta", "deducoes", "receitaLiquida", "cmv", "lucroBruto", "outrasReceitasOperacionais", "despesasGerais", "despesasComerciais", "despesasTributarias", "depreciacaoAmortizacao", "outrasDespesasOperacionais", "resultadoAtividade", "receitasFinanceiras", "despesasFinanceiras", "variacaoCambial", "resultadoNaoOperacional", "impostoRenda", "participacoes", "lucroLiquido", "caixaEquivalentes", "titulosValoresMobiliarios", "contasReceberClientes", "estoques", "adiantamentoFornecedores", "outrosAtivosOperacionaisCirc", "outrosAtivosNaoOperacionaisCirc", "contasReceberColigadas", "investimentos", "imobilizado", "intangivel", "outrosAtivosNaoCirculantes", "fornecedores", "salariosEncargos", "impostosContribuicoes", "emprestimosCurtoPrazo", "irAPagar", "emprestimosColigadasCP", "dividendosAPagar", "adiantamentosClientes", "outrosPassivosCirc", "emprestimosLongoPrazo", "outrosPassivosNaoCirc", "capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes", "ativosMoedaEstrangeira", "passivosMoedaEstrangeira", "extractedRaw", "aiInsights", "createdAt", "updatedAt") VALUES
('57bee85f-cdec-41d5-80b8-9d8645e14c6e', '2026 S1', '2026-06-30', 181, 'Balancete_nayme_062026.pdf', 113134689.94, 3352848.73, 109781841.21, 101531141.64, 8250699.57, 275777.06, 1200501.81, 2240358.41, 8871.41, 64027.78, 0.00, 5012717.22, 159626.05, 1252113.08, 871125.78, 0.00, 0.00, 0.00, 4791355.97, 6704264.21, 0.00, 37875648.95, 14894892.81, 6023256.96, 2296749.82, 0.00, 4110446.40, 0.00, 2905610.44, 0.00, 0.00, 28597542.63, 104209.71, 7963.90, 39879609.46, 0.00, 0.00, 0.00, 628577.07, 0.00, 0.00, 0.00, 800000.00, 0.00, 4792966.82, 0.00, 18562620.29, 30068724.79, '{"periodLabel":"2026 S1","referenceDate":"2026-06-30","periodDays":181,"sourceFileName":"Balancete_nayme_062026.pdf","receitaBruta":113134689.94,"deducoes":3352848.73,"receitaLiquida":109781841.21,"cmv":101531141.64,"lucroBruto":8250699.57,"outrasReceitasOperacionais":275777.06,"despesasGerais":1200501.81,"despesasComerciais":2240358.41,"despesasTributarias":8871.41,"depreciacaoAmortizacao":64027.78,"outrasDespesasOperacionais":0,"resultadoAtividade":5012717.22,"receitasFinanceiras":159626.05,"despesasFinanceiras":1252113.08,"variacaoCambial":871125.78,"resultadoNaoOperacional":0,"impostoRenda":0,"participacoes":0,"lucroLiquido":4791355.97,"caixaEquivalentes":6704264.21,"titulosValoresMobiliarios":0,"contasReceberClientes":37875648.95,"estoques":14894892.81,"adiantamentoFornecedores":6023256.96,"outrosAtivosOperacionaisCirc":2296749.82,"outrosAtivosNaoOperacionaisCirc":0,"contasReceberColigadas":4110446.4,"investimentos":0,"imobilizado":2905610.44,"intangivel":0,"outrosAtivosNaoCirculantes":0,"fornecedores":28597542.63,"salariosEncargos":104209.71,"impostosContribuicoes":7963.9,"emprestimosCurtoPrazo":39879609.46,"irAPagar":0,"emprestimosColigadasCP":0,"dividendosAPagar":0,"adiantamentosClientes":628577.07,"outrosPassivosCirc":0,"emprestimosLongoPrazo":0,"outrosPassivosNaoCirc":0,"capitalSocial":800000,"reservas":0,"lucrosPrejuizosAcumulados":4792966.82,"outrosResultadosAbrangentes":0,"ativosMoedaEstrangeira":18562620.29,"passivosMoedaEstrangeira":30068724.79}'::jsonb, NULL, '2026-08-07T14:07:41.639Z', '2026-08-07T14:07:41.639Z')
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
