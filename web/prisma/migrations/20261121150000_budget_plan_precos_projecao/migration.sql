-- Preco R$/saca da projecao (interno/externo) salvo no plano, para a pagina
-- Premissas valer em Historico e Projecoes e em Tributos. Nulo = preco do
-- ultimo trimestre fechado.
ALTER TABLE "budget_plans" ADD COLUMN "precoSacaInterno" DECIMAL(18,2);
ALTER TABLE "budget_plans" ADD COLUMN "precoSacaExterno" DECIMAL(18,2);
