-- CreateEnum
CREATE TYPE "BudgetScenario" AS ENUM ('CONSERVADOR', 'MODERADO', 'OTIMISTA', 'MUITO_OTIMISTA');

-- CreateEnum
CREATE TYPE "BudgetGroup" AS ENUM ('CUSTO_FORNECEDOR', 'DESPESA_ADM_FIXA', 'DESPESA_ADM_VARIAVEL', 'DESPESA_MERCADO_INTERNO', 'DESPESA_MERCADO_EXTERNO', 'DESPESA_PESSOAL', 'IMPOSTOS', 'FINANCIAMENTO', 'INVESTIMENTOS');

-- CreateTable
CREATE TABLE "budget_plans" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "scenario" "BudgetScenario" NOT NULL DEFAULT 'CONSERVADOR',
    "cotacaoSacaUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cotacaoDolar" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "crescimentoModerado" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "crescimentoOtimista" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "crescimentoMuitoOtimista" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_volume_months" (
    "id" TEXT NOT NULL,
    "budgetPlanId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "volumeBaseSacas" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "volumeExternoSacas" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "volumeInternoRealizado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "volumeExternoRealizado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "receitaRealizada" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "budget_volume_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "budgetPlanId" TEXT NOT NULL,
    "group" "BudgetGroup" NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_line_months" (
    "id" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "valorPrevisto" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorRealizado" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "budget_line_months_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_plans_year_key" ON "budget_plans"("year");

-- CreateIndex
CREATE UNIQUE INDEX "budget_volume_months_budgetPlanId_month_key" ON "budget_volume_months"("budgetPlanId", "month");

-- CreateIndex
CREATE INDEX "budget_lines_budgetPlanId_group_idx" ON "budget_lines"("budgetPlanId", "group");

-- CreateIndex
CREATE UNIQUE INDEX "budget_line_months_budgetLineId_month_key" ON "budget_line_months"("budgetLineId", "month");

-- AddForeignKey
ALTER TABLE "budget_volume_months" ADD CONSTRAINT "budget_volume_months_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "budget_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "budget_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_line_months" ADD CONSTRAINT "budget_line_months_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "budget_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: Plano Orcamentario 2025, com as premissas basicas do modelo padrao
-- (cotacao saca/dolar, % de crescimento por cenario) e o catalogo de linhas
-- de despesa organizado nos 9 grupos, zerado para o usuario preencher pela
-- tela. Classificacao das linhas por grupo definida a partir da analise do
-- arquivo original do cliente (planejamento e orcamentos - ANO 2025):
-- Custo Fornecedor = COGS; Despesa Adm Fixa = ex-Estrutura + ex-Terceiros;
-- Despesa Adm Variavel = ex-Marketing + ex-Administrativa + parte de
-- ex-Operacional sem vinculo direto a exportacao; Despesa Mercado Externo =
-- linhas de custo de exportacao (fretes internacionais, capatazias, taxas
-- portuarias, embalagens); Despesa Mercado Interno = frete de vendas
-- domesticas.
INSERT INTO "budget_plans" ("id", "year", "name", "scenario", "cotacaoSacaUsd", "cotacaoDolar", "crescimentoModerado", "crescimentoOtimista", "crescimentoMuitoOtimista", "updatedAt")
VALUES (gen_random_uuid()::text, 2025, 'Plano Orçamentário 2025', 'CONSERVADOR', 297, 5.90, 0.05, 0.10, 0.1719, CURRENT_TIMESTAMP);

INSERT INTO "budget_lines" ("id", "budgetPlanId", "group", "name", "orderIndex")
SELECT gen_random_uuid()::text, p.id, x.grp::"BudgetGroup", x.name, x.ord
FROM "budget_plans" p
CROSS JOIN (VALUES
  ('CUSTO_FORNECEDOR', 'Custo Mercadorias Vendidas', 1),
  ('CUSTO_FORNECEDOR', 'Fretes sobre Compras', 2),
  ('CUSTO_FORNECEDOR', 'Armazenagem / Rebeneficio / Movimentação / Seguros', 3),
  ('CUSTO_FORNECEDOR', 'Funrural / Senar', 4),

  ('DESPESA_ADM_FIXA', 'Aluguel', 1),
  ('DESPESA_ADM_FIXA', 'Limpeza', 2),
  ('DESPESA_ADM_FIXA', 'Compra de Equipamentos e Softwares', 3),
  ('DESPESA_ADM_FIXA', 'Licença ou Aluguel de Softwares', 4),
  ('DESPESA_ADM_FIXA', 'Água e Esgoto', 5),
  ('DESPESA_ADM_FIXA', 'Manutenção de Equipamentos', 6),
  ('DESPESA_ADM_FIXA', 'Energia Elétrica', 7),
  ('DESPESA_ADM_FIXA', 'Taxa de Licença', 8),
  ('DESPESA_ADM_FIXA', 'Internet', 9),
  ('DESPESA_ADM_FIXA', 'Telefonia', 10),
  ('DESPESA_ADM_FIXA', 'IPTU', 11),
  ('DESPESA_ADM_FIXA', 'Contabilidade', 12),
  ('DESPESA_ADM_FIXA', 'Consultoria', 13),
  ('DESPESA_ADM_FIXA', 'Advogados', 14),
  ('DESPESA_ADM_FIXA', 'T.I', 15),

  ('DESPESA_ADM_VARIAVEL', 'Eventos', 1),
  ('DESPESA_ADM_VARIAVEL', 'Mídias Sociais', 2),
  ('DESPESA_ADM_VARIAVEL', 'Marketing', 3),
  ('DESPESA_ADM_VARIAVEL', 'Material de Escritório', 4),
  ('DESPESA_ADM_VARIAVEL', 'Lanches e Refeições', 5),
  ('DESPESA_ADM_VARIAVEL', 'Material de Uso e Consumo', 6),
  ('DESPESA_ADM_VARIAVEL', 'Doação', 7),
  ('DESPESA_ADM_VARIAVEL', 'Cartório', 8),
  ('DESPESA_ADM_VARIAVEL', 'Confraternizações', 9),
  ('DESPESA_ADM_VARIAVEL', 'Combustível', 10),
  ('DESPESA_ADM_VARIAVEL', 'Seguros', 11),
  ('DESPESA_ADM_VARIAVEL', 'IOF', 12),
  ('DESPESA_ADM_VARIAVEL', 'Taxas Comerciais', 13),
  ('DESPESA_ADM_VARIAVEL', 'Gastos com Veículos', 14),
  ('DESPESA_ADM_VARIAVEL', 'DHL / FEDEX', 15),
  ('DESPESA_ADM_VARIAVEL', 'Tarifas Bancárias', 16),
  ('DESPESA_ADM_VARIAVEL', 'Viagens', 17),
  ('DESPESA_ADM_VARIAVEL', 'Tarifa PIX / TED / DOC', 18),
  ('DESPESA_ADM_VARIAVEL', 'Aluguel de Veículos', 19),
  ('DESPESA_ADM_VARIAVEL', 'Motoboy', 20),
  ('DESPESA_ADM_VARIAVEL', 'Estacionamento / Pedágio', 21),
  ('DESPESA_ADM_VARIAVEL', 'IPVA', 22),
  ('DESPESA_ADM_VARIAVEL', 'Patrocínio', 23),
  ('DESPESA_ADM_VARIAVEL', 'ART / RRT', 24),

  ('DESPESA_MERCADO_INTERNO', 'Frete sobre Vendas (Mercado Interno)', 1),

  ('DESPESA_MERCADO_EXTERNO', 'Embalagens (Sacarias / Bag / Liner)', 1),
  ('DESPESA_MERCADO_EXTERNO', 'Capatazias', 2),
  ('DESPESA_MERCADO_EXTERNO', 'Taxa de BL', 3),
  ('DESPESA_MERCADO_EXTERNO', 'Lacre', 4),
  ('DESPESA_MERCADO_EXTERNO', 'ISPS', 5),
  ('DESPESA_MERCADO_EXTERNO', 'Despachante', 6),
  ('DESPESA_MERCADO_EXTERNO', 'Certificados', 7),
  ('DESPESA_MERCADO_EXTERNO', 'Centro de Comércio de Café (ICO)', 8),
  ('DESPESA_MERCADO_EXTERNO', 'Fumigação', 9),

  ('DESPESA_PESSOAL', 'FGTS', 1),
  ('DESPESA_PESSOAL', 'INSS', 2),
  ('DESPESA_PESSOAL', 'Salário / Férias e 13º + Ajuda de Custo', 3),
  ('DESPESA_PESSOAL', 'Vale Refeição', 4),
  ('DESPESA_PESSOAL', 'Seguro de Vida', 5),
  ('DESPESA_PESSOAL', 'Custo Prestação de Serviços', 6),
  ('DESPESA_PESSOAL', 'Pró-labore', 7),
  ('DESPESA_PESSOAL', 'Plano de Saúde', 8),
  ('DESPESA_PESSOAL', 'Encargos sobre Provisão de 13º', 9),
  ('DESPESA_PESSOAL', 'Encargos sobre Provisão de Férias', 10),
  ('DESPESA_PESSOAL', 'Exames / Medicina do Trabalho', 11),
  ('DESPESA_PESSOAL', 'Rescisões', 12),
  ('DESPESA_PESSOAL', 'Vale Transporte', 13),

  ('IMPOSTOS', 'PIS', 1),
  ('IMPOSTOS', 'COFINS', 2),
  ('IMPOSTOS', 'IRPJ', 3),
  ('IMPOSTOS', 'CSLL', 4),
  ('IMPOSTOS', 'Simples Nacional (DAS)', 5),
  ('IMPOSTOS', 'DARE', 6),

  ('FINANCIAMENTO', 'Juros Financeiro / Hedge', 1),

  ('INVESTIMENTOS', 'Cursos / Treinamentos', 1),
  ('INVESTIMENTOS', 'Máquinas e Equipamentos', 2),
  ('INVESTIMENTOS', 'Móveis e Utensílios', 3),
  ('INVESTIMENTOS', 'Equipamentos de Informática', 4),
  ('INVESTIMENTOS', 'Infraestrutura (Construção da Sede)', 5),
  ('INVESTIMENTOS', 'Veículos', 6),
  ('INVESTIMENTOS', 'Consórcios', 7),
  ('INVESTIMENTOS', 'Prestação do Imóvel', 8)
) AS x(grp, name, ord)
WHERE p.year = 2025;
