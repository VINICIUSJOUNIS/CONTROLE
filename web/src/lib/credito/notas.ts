// Correcoes feitas em relacao a planilha "ANALISE BANLACO PARA CREDITO.xlsx"
// ao trazer os calculos para o sistema (revisao de contador e analista de credito).
export const NOTAS_METODOLOGIA: { titulo: string; planilha: string; sistema: string }[] = [
  {
    titulo: "Base mensal em vez de anual",
    planilha: "Três colunas de anos (2022-2024); prazos médios usavam um nº de dias extraído do texto do ano (\"2022\" virava mês 2 = 60 dias).",
    sistema: "Um registro por mês. Prazos médios usam 30 dias (convenção comercial 30/360 da própria planilha); retornos e EBITDA também são mostrados anualizados (× 12) ou em 12 meses quando houver histórico.",
  },
  {
    titulo: "Resultado da Atividade (EBIT)",
    planilha: "DRE!F18 = Lucro Bruto − Despesas + Depreciação: somava a depreciação em vez de subtrair e ignorava despesas tributárias e outras receitas.",
    sistema: "EBIT = Lucro Bruto − Despesas com Vendas, Administrativas, Tributárias, Depreciação e Outras + Outras Receitas Operacionais ± Equivalência.",
  },
  {
    titulo: "EBITDA",
    planilha: "Análise!C76 = EBIT − Depreciação (subtraía de novo) e o Fluxo de Caixa usava o EBIT como se fosse EBITDA.",
    sistema: "EBITDA = EBIT + Depreciação e Amortização. Quando a DRE não destaca a depreciação, ela é estimada pela variação da depreciação acumulada do balanço.",
  },
  {
    titulo: "Lucro antes do IR",
    planilha: "Input!D118 = EBIT + Resultado Financeiro − Outras Receitas Não Operacionais (subtraía receita) e ignorava despesas não operacionais.",
    sistema: "LAIR = EBIT + Resultado Financeiro ± Resultado Não Operacional.",
  },
  {
    titulo: "Lucro líquido",
    planilha: "Input!D121 somava o IR (D118 + D119) na 1ª coluna e subtraía na 2ª; Input!H95 e H100 somavam deduções e custos.",
    sistema: "Lucro Líquido = LAIR − IRPJ/CSLL − Participações, com sinais padronizados em todas as linhas. O sistema confere o lucro recalculado contra o lucro do PDF.",
  },
  {
    titulo: "Variação cambial",
    planilha: "Linha de variação monetária/cambial sempre zerada - relevante para exportadora (ACC e clientes em dólar).",
    sistema: "Extraída à parte (onde quer que a contabilidade apresente, inclusive dentro de custos) e levada ao resultado financeiro, padrão de análise bancária.",
  },
  {
    titulo: "Necessidade de Capital de Giro",
    planilha: "Não incluía adiantamento a fornecedores nem adiantamentos de clientes; \"Outros Ativos Operacionais\" apontava para a linha de não operacionais (vazia).",
    sistema: "Modelo Fleuriet completo: NCG = (clientes + estoques + adiantamento a fornecedores + tributos a recuperar + outros operacionais) − (fornecedores + salários + impostos + IR/CS + adiantamentos de clientes + outros). CCL − NCG = Saldo de Tesouraria, com classificação Tipo I a VI.",
  },
  {
    titulo: "ACC e dívida financeira",
    planilha: "Só \"Empréstimos Bancários\"; ACC não tinha linha própria.",
    sistema: "ACC/ACE sempre como dívida financeira de curto prazo, separado dos empréstimos. Dívida líquida = empréstimos + ACC + LP + mútuos de sócios − caixa e aplicações; novos indicadores Dívida Líquida/EBITDA e Cobertura de Juros.",
  },
  {
    titulo: "Prazos médios",
    planilha: "PMR sobre receita líquida e PMP sobre CMV, multiplicados por um nº de dias errado (NCG chegava a multiplicar pelo ano).",
    sistema: "PMR sobre receita bruta (recebíveis incluem impostos); PMP sobre compras = CMV + estoque final − estoque inicial; ciclo operacional e ciclo financeiro.",
  },
  {
    titulo: "Composição das exigibilidades e variação da dívida",
    planilha: "Rótulo \"PNC/(PC+PNC)\" mas a fórmula calculava PC/(PC+PNC); \"Variação da Dívida Bancária\" comparava percentuais de participação, não a dívida.",
    sistema: "Composição = PC ÷ (PC + PNC), com rótulo correto. Variação da dívida = dívida bancária atual ÷ anterior − 1.",
  },
  {
    titulo: "Patrimônio líquido e fechamento do balanço",
    planilha: "Em 2022 o passivo + PL não fechava com o ativo (diferença igual ao lucro do ano, não lançado no PL). A evolução do PL subtraía lucros acumulados mesmo quando positivos.",
    sistema: "O sistema confere Ativo = Passivo + PL; a diferença (resultado do período ainda não incorporado) entra no PL ajustado e é sinalizada. Lucros/prejuízos acumulados com sinal.",
  },
  {
    titulo: "Média mensal e evolução de vendas",
    planilha: "Média mensal dividia a receita anual pelo \"mês\" extraído do ano (2).",
    sistema: "Comparação direta com o mês anterior; a média e os comparativos anuais ficam para os dashboards por ano.",
  },
  {
    titulo: "Fluxo de caixa",
    planilha: "IR com sinal invertido, EBIT no lugar do EBITDA e sem fechamento contra o caixa do balanço.",
    sistema: "DFC indireta do mês entre o balanço atual e o anterior, com fechamento: caixa inicial + fluxo gerado = caixa final do balanço (diferença mostrada).",
  },
  {
    titulo: "EBITDA ajustado (revisão)",
    planilha: "-",
    sistema: "EBITDA conforme a Resolução CVM 156/2022 (LL + IR/CSLL + resultado financeiro + D&A) ajustado para crédito: exclui a equivalência patrimonial, que não é caixa. Antes ela entrava no EBITDA e era somada de novo no fluxo de caixa.",
  },
  {
    titulo: "Retornos sobre saldos médios",
    planilha: "ROE e ROA sobre o saldo final.",
    sistema: "ROE, ROA, giro do ativo, ROIC e custo da dívida sobre o saldo médio do mês ((início + fim) ÷ 2). Com PL médio negativo o ROE não é calculado (passivo a descoberto).",
  },
  {
    titulo: "Grau de alavancagem financeira",
    planilha: "LL/PL ÷ EBIT/AT: misturava retorno depois do IR com retorno antes do IR.",
    sistema: "GAF = ROE ÷ ROIC (Assaf Neto), ambos depois do IR, com NOPAT = EBIT × (1 − 34%). Novo ROIC e custo médio da dívida para comparar se o crédito cria valor.",
  },
  {
    titulo: "Provisão de IRPJ e CSLL",
    planilha: "Sem conferência.",
    sistema: "Alíquota efetiva = IR/CSLL ÷ LAIR. Abaixo de 23,8% (34% com compensação máxima de prejuízo fiscal de 30%) o sistema alerta e mostra o lucro líquido ajustado com IR/CSLL de 34%, além do lucro contábil.",
  },
  {
    titulo: "Derivativos e rastreabilidade",
    planilha: "-",
    sistema: "MTM negativo de derivativos/hedge tem campo próprio no passivo (fora do capital de giro, dentro da tesouraria). Nova conferência: a soma das contas de origem do PDF tem que bater com cada campo extraído.",
  },
  {
    titulo: "Novos indicadores",
    planilha: "-",
    sistema: "Liquidez imediata, endividamento geral, imobilização do PL e dos recursos não correntes, dívida líquida/PL, custo médio da dívida, ROIC, margens bruta/EBITDA/líquida, ROE e ROA anualizados, dívida financeira no exigível, geração interna de recursos (FFO) e geração operacional de caixa.",
  },
];
