-- Lanca os balancetes de 2021 e 2020 (comparativo) do "INSTITUTO DOS
-- MISSIONARIOS SAC DE NOSSA SENHORA", extraidos manualmente do PDF
-- "BALANCO E DRE INSTITUTO MATRIZ 2021.pdf" (Balanco Patrimonial +
-- Demonstracao do Resultado, ambos encerrados em 31/12/2021, com coluna
-- comparativa do exercicio anterior).
--
-- Entidade sem fins lucrativos (nao uma empresa comercial): nao ha
-- contasReceberClientes, estoques, fornecedores ligados a CMV nem
-- emprestimos bancarios no balanco. Os campos foram mapeados pelo
-- significado contabil mais proximo (ex: Patrimonio Social -> capitalSocial,
-- Superavit/Deficit -> lucroLiquido). Todos os totais do balanco (Ativo =
-- Passivo) e o resultado de 2021 (Total Receitas - Total Despesas =
-- Deficit de R$110.672,33) foram conferidos numero a numero contra o PDF e
-- batem exatamente.
--
-- Ressalva: no exercicio de 2020 (coluna comparativa), a soma das linhas
-- de receita/despesa da propria DRE do documento resulta em um superavit de
-- R$998.335,08, mas o Patrimonio Liquido do balanco reporta o superavit do
-- exercicio como R$942.846,78 (diferenca de R$55.488,30 nao explicada pelo
-- documento). Usamos aqui o valor do balanco (942.846,78) para lucroLiquido,
-- por ser o numero auditado que fecha com o Patrimonio Liquido - as demais
-- linhas de receita/despesa de 2020 permanecem como transcritas do PDF.

INSERT INTO "financial_statements" (
  "id", "periodLabel", "referenceDate", "periodDays", "sourceFileName",
  "receitaBruta", "deducoes", "receitaLiquida", "cmv", "lucroBruto",
  "outrasReceitasOperacionais", "despesasGerais", "despesasComerciais",
  "despesasTributarias", "depreciacaoAmortizacao", "outrasDespesasOperacionais",
  "resultadoAtividade", "receitasFinanceiras", "despesasFinanceiras",
  "variacaoCambial", "resultadoNaoOperacional", "impostoRenda", "participacoes",
  "lucroLiquido",
  "caixaEquivalentes", "titulosValoresMobiliarios", "contasReceberClientes",
  "estoques", "adiantamentoFornecedores", "outrosAtivosOperacionaisCirc",
  "outrosAtivosNaoOperacionaisCirc",
  "contasReceberColigadas", "investimentos", "imobilizado", "intangivel",
  "outrosAtivosNaoCirculantes",
  "fornecedores", "salariosEncargos", "impostosContribuicoes",
  "emprestimosCurtoPrazo", "irAPagar", "emprestimosColigadasCP",
  "dividendosAPagar", "adiantamentosClientes", "outrosPassivosCirc",
  "emprestimosLongoPrazo", "outrosPassivosNaoCirc",
  "capitalSocial", "reservas", "lucrosPrejuizosAcumulados", "outrosResultadosAbrangentes",
  "ativosMoedaEstrangeira", "passivosMoedaEstrangeira",
  "extractedRaw", "createdAt", "updatedAt"
) VALUES
(
  gen_random_uuid(), '2020', '2020-12-31', 365,
  'BALANCO E DRE INSTITUTO MATRIZ 2021.pdf (coluna Exercicio Anterior)',
  1616896.43, 0, 1616896.43, 0, 1616896.43,
  0, 511046.72, 0,
  17286.45, 59975.24, 14781.98,
  1013806.04, 4727.40, 38655.40,
  0, 18457.04, 0, 0,
  942846.78,
  1162266.66, 0, 0,
  0, 0, 7472.58,
  0,
  0, 0, 902797.38, 0,
  0,
  14971.83, 2823.69, 154298.42,
  0, 0, 0,
  0, 0, 354996.72,
  0, 0,
  2840989.93, 0, -1295543.97, 0,
  NULL, NULL,
  '{"fonte":"PDF (leitura manual assistida por IA)","arquivo":"BALANCO E DRE INSTITUTO MATRIZ 2021.pdf","entidade":"INSTITUTO DOS MISSIONARIOS SAC DE NOSSA SENHORA","cnpj":"22295638000130","ressalva":"lucroLiquido usa o superavit auditado do balanco (942846.78); a soma das linhas da DRE do documento para este periodo resulta em 998335.08, diferenca de 55488.30 nao explicada pelo PDF"}',
  NOW(), NOW()
),
(
  gen_random_uuid(), '2021', '2021-12-31', 365,
  'BALANCO E DRE INSTITUTO MATRIZ 2021.pdf',
  335825.96, 0, 335825.96, 134.70, 335691.26,
  0, 399220.47, 0,
  21654.64, 48337.44, 6000.00,
  -139521.29, 31510.96, 2662.00,
  0, 0, 0, 0,
  -110672.33,
  556187.02, 0, 0,
  0, 0, 165871.58,
  0,
  0, 0, 854459.94, 0,
  0,
  6678.90, 0, 154429.86,
  0, 0, 0,
  0, 0, 580254.44,
  0, 0,
  3848124.03, 0, -3012968.69, 0,
  NULL, NULL,
  '{"fonte":"PDF (leitura manual assistida por IA)","arquivo":"BALANCO E DRE INSTITUTO MATRIZ 2021.pdf","entidade":"INSTITUTO DOS MISSIONARIOS SAC DE NOSSA SENHORA","cnpj":"22295638000130","conferencia":"Ativo=Passivo e resultado batem exatamente com os totais impressos no documento"}',
  NOW(), NOW()
);
