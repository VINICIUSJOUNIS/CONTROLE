-- Substitui a importacao anterior (balancete bruto de 06/2026, migration
-- 20260807090000) pelos numeros oficiais do Balanco Patrimonial e da DRE
-- Acumulada assinados digitalmente pelo administrador e pela contabilidade
-- (IDEQ), enviados aos bancos - fonte: BALANCO_NAYME.pdf + DRE_NAYME_ACUMULADO.pdf,
-- mesmo periodo (30/06/2026, acumulado 1o semestre).
--
-- ATENCAO - divergencia relevante entre o balancete bruto (trial balance interno,
-- sem ajustes de fechamento) e o balanco/DRE oficial fechado pela contabilidade:
--   Ativo total:    R$ 74.810.869,59 (balancete)  vs  R$ 58.342.900 (oficial)
--   Lucro liquido:  R$ 4.791.355,97 LUCRO (balancete)  vs  -R$ 1.681.857 PREJUIZO (oficial)
-- O balanco/DRE oficial e adotado aqui como fonte de verdade (documento fechado,
-- assinado e efetivamente enviado aos bancos), substituindo o balancete bruto.
--
-- Mapeamento (linha do balanco/DRE oficial -> campo canonico):
-- - receitaBruta/deducoes: o DRE so mostra "Receita operacional liquida" (ja
--   liquida); sem quebra de receita bruta/deducoes no documento, receitaBruta =
--   receitaLiquida e deducoes = 0 (nao inventado, apenas nao discriminado na fonte).
-- - cmv inclui "Variacao ativa"/"Variacao passiva" (ja netadas pelo DRE antes do
--   Lucro Bruto - custo do produto ajustado por variacao de precificacao/cambio
--   da mercadoria, nao um resultado financeiro).
-- - despesasGerais = "Despesas gerais e administrativas" (unica linha no DRE, sem
--   quebra comercial/tributaria/depreciacao - despesasComerciais/despesasTributarias/
--   depreciacaoAmortizacao ficam 0 para nao fabricar uma divisao que nao esta na fonte).
-- - outrasReceitasOperacionais = "Outras receitas ou despesas liquidas" (ja liquida
--   e positiva no periodo).
-- - variacaoCambial = 0: neste DRE a variacao cambial/de mercadoria ja esta dentro
--   do CMV (Variacao ativa/passiva acima do Lucro Bruto), nao no resultado financeiro.
-- - "Tributos a recolher" (passivo, R$ 588.942) = impostosContribuicoes (R$ 7.964,
--   igual ao ICMS/PIS/COFINS a recolher do balancete anterior) + irAPagar (R$
--   580.978, exatamente o valor de "Imposto de renda e contribuicao social do
--   periodo" no DRE) - o balanco oficial nao separa as duas, mas a soma bate exata.
-- - "Resultado do exercicio" ((R$ 1.681.857) prejuizo) somado a "Lucros/Prejuizos
--   acumulados" (R$ 3.378.580) para lucrosPrejuizosAcumulados = R$ 1.696.723 -
--   o balanco oficial ja fecha com o resultado do periodo dentro do PL (diferente
--   do balancete bruto, que deixava o resultado fora, em contas de resultado).
-- - "Consorcio" (ativo nao circulante, R$ 304.749) vai em outrosAtivosNaoCirculantes
--   (nao ha campo proprio para cota de consorcio no schema).
-- - ativosMoedaEstrangeira/passivosMoedaEstrangeira ficam NULL: o balanco oficial
--   nao discrimina saldo em moeda estrangeira (diferente do balancete bruto, que
--   permitia estimar via duplicatas mercado externo/ACC) - mantido em branco em
--   vez de reaproveitar uma estimativa de outra fonte.
--
-- Conferido linha a linha contra os documentos oficiais: Ativo Circulante, Ativo
-- Nao Circulante, Ativo Total, Passivo Circulante, Patrimonio Liquido, Lucro
-- Operacional e Lucro do Exercicio batem exatos (diferenca <= R$1 por
-- arredondamento do documento fonte, que nao usa centavos).

INSERT INTO "financial_statements" ("id", "periodLabel", "referenceDate", "periodDays", "sourceFileName", "receitaBruta", "deducoes", "receitaLiquida", "cmv", "lucroBruto", "outrasReceitasOperacionais", "despesasGerais", "despesasComerciais", "despesasTributarias", "depreciacaoAmortizacao", "outrasDespesasOperacionais", "resultadoAtividade", "receitasFinanceiras", "despesasFinanceiras", "variacaoCambial", "resultadoNaoOperacional", "impostoRenda", "participacoes", "lucroLiquido", "caixaEquivalentes", "titulosValoresMobiliarios", "contasReceberClientes", "estoques", "adiantamentoFornecedores", "outrosAtivosOperacionaisCirc", "outrosAtivosNaoOperacionaisCirc", "contasReceberColigadas", "investimentos", "imobilizado", "intangivel", "outrosAtivosNaoCirculantes", "fornecedores", "salariosEncargos", "impostosContribuicoes", "emprestimosCurtoPrazo", "irAPagar", "emprestimosColigadasCP", "dividendosAPagar", "adiantamentosClientes", "outrosPassivosCirc", "emprestimosLongoPrazo", "outrosPassivosNaoCirc", "capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes", "ativosMoedaEstrangeira", "passivosMoedaEstrangeira", "extractedRaw", "aiInsights", "createdAt", "updatedAt") VALUES
('418d60f1-64b8-4e4f-900e-ef426f615dee', '2026 S1', '2026-06-30', 181, 'BALANCO_NAYME.pdf + DRE_NAYME_ACUMULADO.pdf', 178773852.00, 0.00, 178773852.00, 171756386.00, 7017466.00, 420816.00, 6019081.00, 0.00, 0.00, 0.00, 0.00, 1419201.00, 275643.00, 2795723.00, 0.00, 0.00, 580978.00, 0.00, -1681857.00, 7943259.00, 0.00, 29451660.00, 14894893.00, 283136.00, 1057755.00, 0.00, 1501838.00, 0.00, 2905610.00, 0.00, 304749.00, 14718374.00, 104210.00, 7964.00, 39806074.00, 580978.00, 0.00, 0.00, 628577.00, 0.00, 0.00, 0.00, 800000.00, 0.00, 1696723.00, 0.00, NULL, NULL, '{"periodLabel":"2026 S1","referenceDate":"2026-06-30","periodDays":181,"sourceFileName":"BALANCO_NAYME.pdf + DRE_NAYME_ACUMULADO.pdf","receitaBruta":178773852,"deducoes":0,"receitaLiquida":178773852,"cmv":171756386,"lucroBruto":7017466,"outrasReceitasOperacionais":420816,"despesasGerais":6019081,"despesasComerciais":0,"despesasTributarias":0,"depreciacaoAmortizacao":0,"outrasDespesasOperacionais":0,"resultadoAtividade":1419201,"receitasFinanceiras":275643,"despesasFinanceiras":2795723,"variacaoCambial":0,"resultadoNaoOperacional":0,"impostoRenda":580978,"participacoes":0,"lucroLiquido":-1681857,"caixaEquivalentes":7943259,"titulosValoresMobiliarios":0,"contasReceberClientes":29451660,"estoques":14894893,"adiantamentoFornecedores":283136,"outrosAtivosOperacionaisCirc":1057755,"outrosAtivosNaoOperacionaisCirc":0,"contasReceberColigadas":1501838,"investimentos":0,"imobilizado":2905610,"intangivel":0,"outrosAtivosNaoCirculantes":304749,"fornecedores":14718374,"salariosEncargos":104210,"impostosContribuicoes":7964,"emprestimosCurtoPrazo":39806074,"irAPagar":580978,"emprestimosColigadasCP":0,"dividendosAPagar":0,"adiantamentosClientes":628577,"outrosPassivosCirc":0,"emprestimosLongoPrazo":0,"outrosPassivosNaoCirc":0,"capitalSocial":800000,"reservas":0,"lucrosPrejuizosAcumulados":1696723,"outrosResultadosAbrangentes":0,"ativosMoedaEstrangeira":null,"passivosMoedaEstrangeira":null}'::jsonb, NULL, '2026-08-07T17:17:56.728Z', '2026-08-07T17:17:56.728Z')
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
