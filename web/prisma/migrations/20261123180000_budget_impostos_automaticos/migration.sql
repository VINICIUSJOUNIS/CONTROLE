-- Impostos do orcamento calculados automaticamente pela regra.
ALTER TABLE "budget_plans" ADD COLUMN "icmsPctInterestadual" DECIMAL(6,4) NOT NULL DEFAULT 0;
ALTER TABLE "budget_plans" ADD COLUMN "icmsAliquotaInterestadual" DECIMAL(6,4) NOT NULL DEFAULT 0.12;
ALTER TABLE "budget_lines" ADD COLUMN "regraImposto" TEXT;
-- Linhas ja cadastradas no grupo Impostos com esses nomes passam a automaticas.
UPDATE "budget_lines"
SET "tipoCusto" = 'AUTOMATICO', "regraImposto" = UPPER(TRIM("name"))
WHERE "group" = 'IMPOSTOS' AND UPPER(TRIM("name")) IN ('PIS', 'COFINS', 'IRPJ', 'CSLL', 'DARE');
