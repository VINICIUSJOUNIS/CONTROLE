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

DO $$
DECLARE
  v_plan_id TEXT;
BEGIN
  SELECT id INTO v_plan_id FROM "budget_plans" WHERE year = 2025;

  INSERT INTO "budget_lines" ("id", "budgetPlanId", "group", "name", "orderIndex") VALUES
    (gen_random_uuid()::text, v_plan_id, 'CUSTO_FORNECEDOR', 'Custo Mercadorias Vendidas', 1),
    (gen_random_uuid()::text, v_plan_id, 'CUSTO_FORNECEDOR', 'Fretes sobre Compras', 2),
    (gen_random_uuid()::text, v_plan_id, 'CUSTO_FORNECEDOR', 'Armazenagem / Rebeneficio / Movimentação / Seguros', 3),
    (gen_random_uuid()::text, v_plan_id, 'CUSTO_FORNECEDOR', 'Funrural / Senar', 4),

    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Aluguel', 1),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Limpeza', 2),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Compra de Equipamentos e Softwares', 3),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Licença ou Aluguel de Softwares', 4),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Água e Esgoto', 5),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Manutenção de Equipamentos', 6),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Energia Elétrica', 7),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Taxa de Licença', 8),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Internet', 9),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Telefonia', 10),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'IPTU', 11),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Contabilidade', 12),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Consultoria', 13),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'Advogados', 14),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_FIXA', 'T.I', 15),

    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Eventos', 1),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Mídias Sociais', 2),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Marketing', 3),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Material de Escritório', 4),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Lanches e Refeições', 5),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Material de Uso e Consumo', 6),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Doação', 7),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Cartório', 8),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Confraternizações', 9),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Combustível', 10),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Seguros', 11),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'IOF', 12),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Taxas Comerciais', 13),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Gastos com Veículos', 14),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'DHL / FEDEX', 15),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Tarifas Bancárias', 16),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Viagens', 17),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Tarifa PIX / TED / DOC', 18),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Aluguel de Veículos', 19),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Motoboy', 20),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Estacionamento / Pedágio', 21),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'IPVA', 22),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'Patrocínio', 23),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_ADM_VARIAVEL', 'ART / RRT', 24),

    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_INTERNO', 'Frete sobre Vendas (Mercado Interno)', 1),

    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'Embalagens (Sacarias / Bag / Liner)', 1),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'Capatazias', 2),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'Taxa de BL', 3),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'Lacre', 4),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'ISPS', 5),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'Despachante', 6),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'Certificados', 7),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'Centro de Comércio de Café (ICO)', 8),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_MERCADO_EXTERNO', 'Fumigação', 9),

    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'FGTS', 1),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'INSS', 2),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Salário / Férias e 13º + Ajuda de Custo', 3),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Vale Refeição', 4),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Seguro de Vida', 5),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Custo Prestação de Serviços', 6),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Pró-labore', 7),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Plano de Saúde', 8),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Encargos sobre Provisão de 13º', 9),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Encargos sobre Provisão de Férias', 10),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Exames / Medicina do Trabalho', 11),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Rescisões', 12),
    (gen_random_uuid()::text, v_plan_id, 'DESPESA_PESSOAL', 'Vale Transporte', 13),

    (gen_random_uuid()::text, v_plan_id, 'IMPOSTOS', 'PIS', 1),
    (gen_random_uuid()::text, v_plan_id, 'IMPOSTOS', 'COFINS', 2),
    (gen_random_uuid()::text, v_plan_id, 'IMPOSTOS', 'IRPJ', 3),
    (gen_random_uuid()::text, v_plan_id, 'IMPOSTOS', 'CSLL', 4),
    (gen_random_uuid()::text, v_plan_id, 'IMPOSTOS', 'Simples Nacional (DAS)', 5),
    (gen_random_uuid()::text, v_plan_id, 'IMPOSTOS', 'DARE', 6),

    (gen_random_uuid()::text, v_plan_id, 'FINANCIAMENTO', 'Juros Financeiro / Hedge', 1),

    (gen_random_uuid()::text, v_plan_id, 'INVESTIMENTOS', 'Cursos / Treinamentos', 1),
    (gen_random_uuid()::text, v_plan_id, 'INVESTIMENTOS', 'Máquinas e Equipamentos', 2),
    (gen_random_uuid()::text, v_plan_id, 'INVESTIMENTOS', 'Móveis e Utensílios', 3),
    (gen_random_uuid()::text, v_plan_id, 'INVESTIMENTOS', 'Equipamentos de Informática', 4),
    (gen_random_uuid()::text, v_plan_id, 'INVESTIMENTOS', 'Infraestrutura (Construção da Sede)', 5),
    (gen_random_uuid()::text, v_plan_id, 'INVESTIMENTOS', 'Veículos', 6),
    (gen_random_uuid()::text, v_plan_id, 'INVESTIMENTOS', 'Consórcios', 7),
    (gen_random_uuid()::text, v_plan_id, 'INVESTIMENTOS', 'Prestação do Imóvel', 8);
END $$;
