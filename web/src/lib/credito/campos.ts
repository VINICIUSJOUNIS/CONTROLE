// Analise de Credito - plano de contas padronizado.
//
// Cada balanco/DRE em PDF e reclassificado pela IA nestes campos, que seguem a
// estrutura da aba "Input Automatico" da planilha "Analise de Balanco para
// Credito" (modelo de banco), com ajustes de um contador/analista de credito
// para uma exportadora de cafe (ACC, hedge, tributos a recuperar, mutuos).
//
// Convencao de sinais: todos os valores sao positivos no sentido natural da
// conta (ativo positivo, passivo positivo, despesa positiva). Campos marcados
// com `sinal: true` aceitam negativo (ex.: variacao cambial liquida, lucros ou
// prejuizos acumulados).

export type GrupoBalanco =
  | "ativoCirculante"
  | "ativoNaoCirculante"
  | "passivoCirculante"
  | "passivoNaoCirculante"
  | "patrimonioLiquido";

export type CampoDef = {
  chave: string;
  rotulo: string;
  // Instrucao de classificacao enviada a IA (e exibida na tela como "o que entra aqui").
  regra: string;
  sinal?: boolean;
};

export type CampoBalanco = CampoDef & { grupo: GrupoBalanco };

export const CAMPOS_BALANCO = [
  // Ativo Circulante
  { grupo: "ativoCirculante", chave: "caixa", rotulo: "Caixa e Bancos", sinal: true, regra: "Caixa e bancos conta movimento, pelo saldo líquido do grupo (saldo credor de banco reduz o valor)." },
  { grupo: "ativoCirculante", chave: "aplicacoesFinanceiras", rotulo: "Aplicações Financeiras", regra: "Aplicações de liquidez imediata (CDB, fundos, poupança, aplicações automáticas)." },
  { grupo: "ativoCirculante", chave: "derivativosHedge", rotulo: "Hedge e Derivativos", regra: "Margens/depósitos em corretoras de hedge (StoneX, Hedgepoint, Marex etc.) e MTM positivo de derivativos." },
  { grupo: "ativoCirculante", chave: "clientes", rotulo: "Contas a Receber de Clientes", regra: "Duplicatas a receber mercado interno e externo, líquidas de PCLD e da variação cambial de clientes." },
  { grupo: "ativoCirculante", chave: "clientesPartesRelacionadas", rotulo: "Contas a Receber de Coligadas", regra: "Clientes que são empresas do grupo, sócios ou coligadas." },
  { grupo: "ativoCirculante", chave: "estoques", rotulo: "Estoques", regra: "Mercadorias, produtos, insumos e embalagens." },
  { grupo: "ativoCirculante", chave: "adiantamentoFornecedores", rotulo: "Adiantamento a Fornecedores", regra: "Adiantamentos a fornecedores (inclusive empresas do grupo quando for adiantamento de compra)." },
  { grupo: "ativoCirculante", chave: "tributosRecuperar", rotulo: "Tributos a Recuperar", regra: "ICMS, PIS, COFINS, IRRF, CIAP e demais tributos a recuperar/compensar no curto prazo." },
  { grupo: "ativoCirculante", chave: "outrosAtivosOperacionaisCirc", rotulo: "Outros Ativos Operacionais", regra: "Demais créditos ligados à operação (despesas antecipadas, adiantamentos a empregados etc.)." },
  { grupo: "ativoCirculante", chave: "outrosAtivosNaoOperacionaisCirc", rotulo: "Outros Ativos Não Operacionais", regra: "Créditos fora da operação no curto prazo (mútuos e empréstimos concedidos, venda de bens etc.)." },
  // Ativo Nao Circulante
  { grupo: "ativoNaoCirculante", chave: "rlpClientes", rotulo: "Contas a Receber (LP)", regra: "Clientes e títulos a receber com vencimento acima de 12 meses." },
  { grupo: "ativoNaoCirculante", chave: "rlpTributos", rotulo: "Tributos a Recuperar e Diferidos (LP)", regra: "Tributos a recuperar de longo prazo e IR/CS diferidos ativos." },
  { grupo: "ativoNaoCirculante", chave: "rlpDepositosJudiciais", rotulo: "Depósitos Judiciais", regra: "Depósitos judiciais e cauções." },
  { grupo: "ativoNaoCirculante", chave: "rlpPartesRelacionadas", rotulo: "Créditos com Sócios, Coligadas e Mútuos", regra: "Empréstimos a sócios, administradores, coligadas e mútuos concedidos a terceiros." },
  { grupo: "ativoNaoCirculante", chave: "rlpOutros", rotulo: "Outros Realizáveis a LP", regra: "Consórcios, aplicações de longo prazo e demais créditos de longo prazo." },
  { grupo: "ativoNaoCirculante", chave: "investimentos", rotulo: "Investimentos", regra: "Participações societárias, cotas de capital de cooperativas, propriedades para investimento." },
  { grupo: "ativoNaoCirculante", chave: "imobilizadoBruto", rotulo: "Imobilizado (custo)", regra: "Imobilizado pelo custo, sem a depreciação acumulada." },
  { grupo: "ativoNaoCirculante", chave: "depreciacaoAcumulada", rotulo: "(-) Depreciação Acumulada", regra: "Depreciação, amortização e exaustão acumuladas do imobilizado e intangível, em valor POSITIVO." },
  { grupo: "ativoNaoCirculante", chave: "intangivel", rotulo: "Intangível", regra: "Intangível pelo custo (marcas, softwares, direitos)." },
  // Passivo Circulante
  { grupo: "passivoCirculante", chave: "fornecedores", rotulo: "Fornecedores", regra: "Fornecedores pelo saldo líquido do grupo (saldos devedores de fornecedores reduzem o valor)." },
  { grupo: "passivoCirculante", chave: "salariosEncargos", rotulo: "Salários, Encargos e Provisões Trabalhistas", regra: "Salários, INSS, FGTS, IRRF sobre salários, provisões de férias e 13º." },
  { grupo: "passivoCirculante", chave: "impostosRecolher", rotulo: "Impostos e Contribuições a Recolher", regra: "ICMS, ISS, PIS, COFINS, IRRF, CSRF e parcelamentos de curto prazo - exceto IRPJ e CSLL." },
  { grupo: "passivoCirculante", chave: "irCsRecolher", rotulo: "IRPJ e CSLL a Recolher", regra: "Imposto de renda e contribuição social sobre o lucro a recolher." },
  { grupo: "passivoCirculante", chave: "emprestimosCP", rotulo: "Empréstimos e Financiamentos (CP)", regra: "Empréstimos e financiamentos bancários, conta garantida, FUNCAFÉ, financiamentos e empréstimos de terceiros de curto prazo - exceto ACC/ACE." },
  { grupo: "passivoCirculante", chave: "accAce", rotulo: "ACC / ACE", regra: "Adiantamentos sobre contratos de câmbio (ACC/ACE). É dívida financeira, nunca adiantamento de cliente." },
  { grupo: "passivoCirculante", chave: "partesRelacionadasCP", rotulo: "Empréstimos de Sócios e Coligadas (CP)", regra: "Mútuos e empréstimos recebidos de sócios e empresas do grupo no curto prazo." },
  { grupo: "passivoCirculante", chave: "dividendosPagar", rotulo: "Dividendos e Lucros a Pagar", regra: "Dividendos, lucros e JCP a pagar." },
  { grupo: "passivoCirculante", chave: "adiantamentosClientes", rotulo: "Adiantamentos de Clientes", regra: "Adiantamentos recebidos de clientes por vendas futuras (não incluir ACC)." },
  { grupo: "passivoCirculante", chave: "outrosPassivosCirc", rotulo: "Outros Passivos Circulantes", regra: "Demais obrigações de curto prazo." },
  // Passivo Nao Circulante
  { grupo: "passivoNaoCirculante", chave: "emprestimosLP", rotulo: "Empréstimos e Financiamentos (LP)", regra: "Empréstimos e financiamentos bancários com vencimento acima de 12 meses." },
  { grupo: "passivoNaoCirculante", chave: "partesRelacionadasLP", rotulo: "Empréstimos de Sócios e Coligadas (LP)", regra: "Mútuos de sócios e empresas do grupo no longo prazo." },
  { grupo: "passivoNaoCirculante", chave: "tributosLP", rotulo: "Tributos Parcelados e Diferidos (LP)", regra: "Parcelamentos tributários e IR/CS diferidos passivos de longo prazo." },
  { grupo: "passivoNaoCirculante", chave: "provisoesLP", rotulo: "Provisões para Contingências", regra: "Provisões para contingências trabalhistas, cíveis e fiscais." },
  { grupo: "passivoNaoCirculante", chave: "outrosPassivosNaoCirc", rotulo: "Outros Passivos Não Circulantes", regra: "Demais obrigações de longo prazo." },
  // Patrimonio Liquido
  { grupo: "patrimonioLiquido", chave: "capitalSocial", rotulo: "Capital Social", regra: "Capital social integralizado (líquido de capital a integralizar)." },
  { grupo: "patrimonioLiquido", chave: "reservas", rotulo: "Reservas e Ajustes", sinal: true, regra: "Reservas de capital e de lucros, ajustes de avaliação patrimonial e ajustes de exercícios anteriores (com sinal)." },
  { grupo: "patrimonioLiquido", chave: "lucrosAcumulados", rotulo: "Lucros ou Prejuízos Acumulados", sinal: true, regra: "Lucros/prejuízos acumulados, incluindo o resultado do exercício em curso quando já lançado no PL (com sinal)." },
] as const satisfies readonly CampoBalanco[];

export const CAMPOS_DRE = [
  { chave: "receitaBruta", rotulo: "Receita Operacional Bruta", regra: "Vendas brutas de mercadorias, produtos e serviços (mercado interno + externo)." },
  { chave: "deducoes", rotulo: "(-) Deduções da Receita", sinal: true, regra: "Devoluções, cancelamentos, descontos incondicionais e impostos sobre vendas. Positivo quando reduz a receita; negativo se o PDF mostrar estorno que aumenta a receita." },
  { chave: "cmv", rotulo: "(-) Custo das Mercadorias Vendidas", regra: "Custo das mercadorias, produtos e serviços vendidos (sem variação cambial/monetária)." },
  { chave: "despesasVendas", rotulo: "(-) Despesas com Vendas", regra: "Comissões, fretes e despesas de entrega/exportação, propaganda, viagens comerciais." },
  { chave: "despesasAdministrativas", rotulo: "(-) Despesas Gerais e Administrativas", regra: "Pessoal, aluguéis, serviços de terceiros, despesas gerais e administrativas." },
  { chave: "despesasTributarias", rotulo: "(-) Despesas Tributárias", regra: "Impostos, taxas e contribuições que não incidem sobre vendas nem sobre o lucro." },
  { chave: "depreciacaoAmortizacao", rotulo: "(-) Depreciação e Amortização", regra: "Somente se a DRE destacar a depreciação/amortização em linha própria; senão 0 (o sistema estima pelo balanço)." },
  { chave: "outrasReceitasOperacionais", rotulo: "(+) Outras Receitas Operacionais", regra: "Recuperação de créditos tributários, receitas diversas operacionais." },
  { chave: "outrasDespesasOperacionais", rotulo: "(-) Outras Despesas Operacionais", regra: "Demais despesas operacionais não classificadas acima." },
  { chave: "equivalenciaPatrimonial", rotulo: "(+/-) Equivalência Patrimonial", sinal: true, regra: "Resultado de equivalência patrimonial (positivo = ganho)." },
  { chave: "receitasFinanceiras", rotulo: "(+) Receitas Financeiras", regra: "Juros ativos, rendimentos de aplicações, descontos obtidos, ganhos com derivativos - sem variação cambial." },
  { chave: "despesasFinanceiras", rotulo: "(-) Despesas Financeiras", regra: "Juros passivos, encargos de ACC/empréstimos, IOF, tarifas bancárias, perdas com derivativos - sem variação cambial." },
  { chave: "variacaoCambialLiquida", rotulo: "(+/-) Variação Cambial e Monetária Líquida", sinal: true, regra: "Variações cambiais e monetárias ativas menos passivas, onde quer que apareçam na DRE (inclusive dentro de custos). Positivo = ganho." },
  { chave: "resultadoNaoOperacional", rotulo: "(+/-) Resultado Não Operacional", sinal: true, regra: "Ganhos e perdas na venda de ativos e outros resultados não operacionais (com sinal)." },
  { chave: "irCs", rotulo: "(-) IRPJ e CSLL", regra: "Provisão de imposto de renda e contribuição social (corrente + diferido)." },
  { chave: "participacoes", rotulo: "(-) Participações", regra: "Participações de empregados e administradores no lucro." },
] as const satisfies readonly CampoDef[];

export type ChaveBalanco = (typeof CAMPOS_BALANCO)[number]["chave"];
export type ChaveDre = (typeof CAMPOS_DRE)[number]["chave"];
export type Balanco = Record<ChaveBalanco, number>;
export type Dre = Record<ChaveDre, number>;

export const ROTULO_GRUPO: Record<GrupoBalanco, string> = {
  ativoCirculante: "Ativo Circulante",
  ativoNaoCirculante: "Ativo Não Circulante",
  passivoCirculante: "Passivo Circulante",
  passivoNaoCirculante: "Passivo Não Circulante",
  patrimonioLiquido: "Patrimônio Líquido",
};

export const CAMPO_POR_CHAVE: Record<string, CampoDef> = Object.fromEntries(
  [...CAMPOS_BALANCO, ...CAMPOS_DRE].map((c) => [c.chave, c])
);

// Contas do PDF que compoem cada campo (memoria de onde o numero foi tirado).
export type ContaOrigem = { codigo: string; descricao: string; valor: number };
export type Origens = Record<string, ContaOrigem[]>;

export const DRE_TIPOS = ["mensal", "acumulado"] as const;
export type DreTipo = (typeof DRE_TIPOS)[number];
