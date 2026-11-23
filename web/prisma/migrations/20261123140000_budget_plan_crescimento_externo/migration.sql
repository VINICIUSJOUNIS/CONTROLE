-- Crescimento por cenario separado entre mercado interno e externo. As colunas
-- existentes passam a ser o mercado interno; as novas (externo) comecam com o
-- mesmo % que ja estava salvo, para o plano nao mudar ate o usuario editar.
ALTER TABLE "budget_plans" ADD COLUMN "crescimentoModeradoExterno" DECIMAL(6,4) NOT NULL DEFAULT 0;
ALTER TABLE "budget_plans" ADD COLUMN "crescimentoOtimistaExterno" DECIMAL(6,4) NOT NULL DEFAULT 0;
ALTER TABLE "budget_plans" ADD COLUMN "crescimentoMuitoOtimistaExterno" DECIMAL(6,4) NOT NULL DEFAULT 0;
UPDATE "budget_plans" SET
  "crescimentoModeradoExterno" = "crescimentoModerado",
  "crescimentoOtimistaExterno" = "crescimentoOtimista",
  "crescimentoMuitoOtimistaExterno" = "crescimentoMuitoOtimista";
