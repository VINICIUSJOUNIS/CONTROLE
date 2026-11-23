-- Cotacao da saca do orcamento passa a ser (nivel de bolsa + diferencial, c/lb)
-- x 1,3228, como no contrato de exportacao. Planos existentes: nivel de bolsa =
-- cotacao atual / 1,3228 e diferencial 0, para a cotacao nao mudar.
ALTER TABLE "budget_plans" ADD COLUMN "nivelBolsa" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "budget_plans" ADD COLUMN "diferencial" DECIMAL(18,4) NOT NULL DEFAULT 0;
UPDATE "budget_plans" SET "nivelBolsa" = ROUND("cotacaoSacaUsd" / 1.3228, 4);
