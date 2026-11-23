-- Linha automatica de credito de CBS/IBS das compras (valor negativo) no grupo
-- Impostos de cada plano que ainda nao tem uma.
INSERT INTO "budget_lines" ("id", "budgetPlanId", "group", "name", "orderIndex", "createdAt", "tipoCusto", "regraImposto")
SELECT gen_random_uuid()::text, p."id", 'IMPOSTOS', 'Crédito CBS/IBS (serviços e insumos)',
       COALESCE((SELECT MAX(l."orderIndex") FROM "budget_lines" l WHERE l."budgetPlanId" = p."id" AND l."group" = 'IMPOSTOS'), 0) + 1,
       NOW(), 'AUTOMATICO', 'CREDITO_CBS_IBS'
FROM "budget_plans" p
WHERE NOT EXISTS (
  SELECT 1 FROM "budget_lines" l WHERE l."budgetPlanId" = p."id" AND l."regraImposto" = 'CREDITO_CBS_IBS'
);
