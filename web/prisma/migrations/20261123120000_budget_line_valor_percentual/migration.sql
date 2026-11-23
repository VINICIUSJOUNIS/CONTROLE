-- Custo do orcamento como % da receita prevista do mes (tipoCusto = "PERCENTUAL").
ALTER TABLE "budget_lines" ADD COLUMN "valorPercentual" DECIMAL(9,4) NOT NULL DEFAULT 0;
