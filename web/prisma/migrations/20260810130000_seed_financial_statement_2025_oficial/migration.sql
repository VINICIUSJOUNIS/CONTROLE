-- Lancamento do Balanco Patrimonial e da DRE oficiais (assinados, enviados
-- aos bancos) de 2025 - substitui a importacao anterior baseada no balancete
-- bruto (que foi apagada do banco a pedido do usuario; nao trabalhamos mais
-- a partir do balancete analitico, so dos documentos oficiais Balanco/DRE).
-- Fontes: "BALANCO ACUMULADO 2025.pdf" e "DRE ACUMULADO 2025.pdf"
-- (NAYME EXPORTADORA DE CAFE LTDA, CNPJ 27.404.965/0001-04, assinados
-- digitalmente pelo administrador e pela contabilidade IDEQ em 04/02/2026).
--
-- Mapeamento (linha do documento oficial -> campo canonico):
-- - receitaBruta = deducoes = 0: a DRE oficial ja comeca direto em "Receita
--   operacional liquida" (411.684.914), sem discriminar bruta/deducoes.
-- - cmv = "Custo dos produtos vendidos" (393.422.413), exatamente como no
--   documento (sem ajustes).
-- - lucroBruto (campo do schema) = receitaLiquida - cmv = 18.262.501. Isso
--   difere do "Lucro bruto" impresso no documento (17.837.832) porque o
--   documento embute a Variacao ativa/passiva (cambial) ANTES do lucro
--   bruto, enquanto o schema tem um campo proprio "variacaoCambial" DEPOIS
--   do resultado da atividade (mesma convencao ja usada no lancamento de
--   06/2026). O total bate de qualquer forma: resultadoAtividade (10.683.178,
--   = lucroBruto + outras receitas - despesas gerais) + receitasFinanceiras -
--   despesasFinanceiras + variacaoCambial (-424.669) = 3.882.144 = "Lucro
--   antes do IR/CSLL" exatamente como no documento.
-- - outrasReceitasOperacionais = "Outras receitas ou despesas liquidas"
--   (1.585.304); despesasGerais = "Despesas gerais e administrativas"
--   (9.164.627) - documento nao discrimina despesasComerciais/Tributarias/
--   Depreciacao separadamente, ficaram 0.
-- - variacaoCambial = "Variacao ativa" (14.160.072) - "Variacao passiva"
--   (14.584.741) = -424.669.
-- - impostoRenda = "Imposto de renda e contribuicao social do periodo"
--   (1.126.879). lucroLiquido = "Lucro do exercicio" (2.755.265), copiado
--   direto do documento (confere exato com a soma dos campos acima).
-- - lucrosPrejuizosAcumulados = "Lucros/Prejuizos acumulados" (884.469) +
--   "Resultado do exercicio" (2.755.265) = 3.639.734 - o schema nao tem
--   campo separado para o resultado do exercicio ainda nao apropriado, entao
--   soma no PL igual ja fizemos antes (senao o PL ficaria 2,76 milhoes menor
--   que o real, distorcendo indices de alavancagem).
-- - Adiantamentos (1.710.601, Ativo Circulante) -> adiantamentoFornecedores;
--   Tributos a recuperar (699.053) -> outrosAtivosOperacionaisCirc;
--   Partes relacionadas (5.090.413) -> contasReceberColigadas; Consorcio
--   (266.504, Ativo Nao Circulante) -> outrosAtivosNaoCirculantes; Tributos a
--   recolher (13.103, Passivo Circulante) -> impostosContribuicoes.
-- - Nao ha discriminacao de ativos/passivos em moeda estrangeira no
--   documento oficial -> ambos NULL.
--
-- Conferido campo a campo: Ativo Circulante (44.737.827), Ativo Nao
-- Circulante (8.385.127), Total do Ativo (53.122.953... 954 por
-- arredondamento de 1 real), Passivo Circulante (48.683.219) e Patrimonio
-- Liquido (4.439.734) batem exatos com os totais impressos no documento.

INSERT INTO "financial_statements" ("id", "periodLabel", "referenceDate", "periodDays", "sourceFileName", "receitaBruta", "deducoes", "receitaLiquida", "cmv", "lucroBruto", "outrasReceitasOperacionais", "despesasGerais", "despesasComerciais", "despesasTributarias", "depreciacaoAmortizacao", "outrasDespesasOperacionais", "resultadoAtividade", "receitasFinanceiras", "despesasFinanceiras", "variacaoCambial", "resultadoNaoOperacional", "impostoRenda", "participacoes", "lucroLiquido", "caixaEquivalentes", "titulosValoresMobiliarios", "contasReceberClientes", "estoques", "adiantamentoFornecedores", "outrosAtivosOperacionaisCirc", "outrosAtivosNaoOperacionaisCirc", "contasReceberColigadas", "investimentos", "imobilizado", "intangivel", "outrosAtivosNaoCirculantes", "fornecedores", "salariosEncargos", "impostosContribuicoes", "emprestimosCurtoPrazo", "irAPagar", "emprestimosColigadasCP", "dividendosAPagar", "adiantamentosClientes", "outrosPassivosCirc", "emprestimosLongoPrazo", "outrosPassivosNaoCirc", "capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes", "ativosMoedaEstrangeira", "passivosMoedaEstrangeira", "extractedRaw", "aiInsights", "createdAt", "updatedAt") VALUES
('d6e3abfd-33ed-4018-ab7a-1bffd84654a0', '2025', '2025-12-31', 365, 'BALANCO ACUMULADO 2025.pdf / DRE ACUMULADO 2025.pdf', 411684914.00, 0.00, 411684914.00, 393422413.00, 18262501.00, 1585304.00, 9164627.00, 0.00, 0.00, 0.00, 0.00, 10683178.00, 245626.00, 6621991.00, -424669.00, 0.00, 1126879.00, 0.00, 2755265.00, 4964078.00, 0.00, 18775395.00, 18588700.00, 1710601.00, 699053.00, 0.00, 5090413.00, 0.00, 3028210.00, 0.00, 266504.00, 11190563.00, 47340.00, 13103.00, 37369219.00, 0.00, 0.00, 0.00, 62994.00, 0.00, 0.00, 0.00, 800000.00, 0.00, 3639734.00, 0.00, NULL, NULL, '{"periodLabel":"2025","referenceDate":"2025-12-31","periodDays":365,"sourceFileName":"BALANCO ACUMULADO 2025.pdf / DRE ACUMULADO 2025.pdf","receitaBruta":411684914,"deducoes":0,"receitaLiquida":411684914,"cmv":393422413,"lucroBruto":18262501,"outrasReceitasOperacionais":1585304,"despesasGerais":9164627,"despesasComerciais":0,"despesasTributarias":0,"depreciacaoAmortizacao":0,"outrasDespesasOperacionais":0,"resultadoAtividade":10683178,"receitasFinanceiras":245626,"despesasFinanceiras":6621991,"variacaoCambial":-424669,"resultadoNaoOperacional":0,"impostoRenda":1126879,"participacoes":0,"lucroLiquido":2755265,"caixaEquivalentes":4964078,"titulosValoresMobiliarios":0,"contasReceberClientes":18775395,"estoques":18588700,"adiantamentoFornecedores":1710601,"outrosAtivosOperacionaisCirc":699053,"outrosAtivosNaoOperacionaisCirc":0,"contasReceberColigadas":5090413,"investimentos":0,"imobilizado":3028210,"intangivel":0,"outrosAtivosNaoCirculantes":266504,"fornecedores":11190563,"salariosEncargos":47340,"impostosContribuicoes":13103,"emprestimosCurtoPrazo":37369219,"irAPagar":0,"emprestimosColigadasCP":0,"dividendosAPagar":0,"adiantamentosClientes":62994,"outrosPassivosCirc":0,"emprestimosLongoPrazo":0,"outrosPassivosNaoCirc":0,"capitalSocial":800000,"reservas":0,"lucrosPrejuizosAcumulados":3639734,"outrosResultadosAbrangentes":0,"ativosMoedaEstrangeira":null,"passivosMoedaEstrangeira":null}'::jsonb, NULL, '2026-08-10T13:00:00.000Z', '2026-08-10T13:00:00.000Z')
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
