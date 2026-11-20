-- Linha de despesa do orcamento pode ter custo por saca (ex.: frete sobre
-- compra R$ 6,00/saca): previsto = valorPorSaca x volume do mes do plano.
ALTER TABLE "budget_lines" ADD COLUMN "tipoCusto" TEXT NOT NULL DEFAULT 'FIXO';
ALTER TABLE "budget_lines" ADD COLUMN "valorPorSaca" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "budget_lines" ADD COLUMN "baseVolume" TEXT NOT NULL DEFAULT 'TOTAL';
