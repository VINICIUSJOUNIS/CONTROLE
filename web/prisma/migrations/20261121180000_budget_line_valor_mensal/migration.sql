-- Linha de despesa com custo fixo mensal: o mesmo valor previsto nos 12 meses.
ALTER TABLE "budget_lines" ADD COLUMN "valorMensal" DECIMAL(18,2) NOT NULL DEFAULT 0;
