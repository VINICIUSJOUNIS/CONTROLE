-- Folha automatica: ferias, 13o e encargos calculados a partir do salario.
ALTER TABLE "budget_plans" ADD COLUMN "ratAjustado" DECIMAL(6,4) NOT NULL DEFAULT 0.03;
ALTER TABLE "budget_plans" ADD COLUMN "terceirosFolha" DECIMAL(6,4) NOT NULL DEFAULT 0.058;

-- A linha "Salario / Ferias e 13o" passa a ser so o salario (digitado).
UPDATE "budget_lines" SET "name" = 'Salário'
WHERE "group" = 'DESPESA_PESSOAL' AND "name" = 'Salário / Férias e 13º';

-- Linhas existentes que viram automaticas.
UPDATE "budget_lines" SET "tipoCusto" = 'AUTOMATICO', "regraImposto" = 'INSS_FOLHA'
WHERE "group" = 'DESPESA_PESSOAL' AND UPPER(TRIM("name")) = 'INSS';
UPDATE "budget_lines" SET "tipoCusto" = 'AUTOMATICO', "regraImposto" = 'FGTS'
WHERE "group" = 'DESPESA_PESSOAL' AND UPPER(TRIM("name")) = 'FGTS';
UPDATE "budget_lines" SET "tipoCusto" = 'AUTOMATICO', "regraImposto" = 'ENCARGOS_13'
WHERE "group" = 'DESPESA_PESSOAL' AND "name" = 'Encargos sobre Provisão de 13º';
UPDATE "budget_lines" SET "tipoCusto" = 'AUTOMATICO', "regraImposto" = 'ENCARGOS_FERIAS'
WHERE "group" = 'DESPESA_PESSOAL' AND "name" = 'Encargos sobre Provisão de Férias';

-- Novas linhas automaticas de ferias e 13o em cada plano.
INSERT INTO "budget_lines" ("id", "budgetPlanId", "group", "name", "orderIndex", "createdAt", "tipoCusto", "regraImposto")
SELECT gen_random_uuid()::text, p."id", 'DESPESA_PESSOAL', 'Férias + 1/3',
       COALESCE((SELECT MAX(l."orderIndex") FROM "budget_lines" l WHERE l."budgetPlanId" = p."id" AND l."group" = 'DESPESA_PESSOAL'), 0) + 1,
       NOW(), 'AUTOMATICO', 'FERIAS'
FROM "budget_plans" p
WHERE NOT EXISTS (SELECT 1 FROM "budget_lines" l WHERE l."budgetPlanId" = p."id" AND l."regraImposto" = 'FERIAS');
INSERT INTO "budget_lines" ("id", "budgetPlanId", "group", "name", "orderIndex", "createdAt", "tipoCusto", "regraImposto")
SELECT gen_random_uuid()::text, p."id", 'DESPESA_PESSOAL', '13º Salário',
       COALESCE((SELECT MAX(l."orderIndex") FROM "budget_lines" l WHERE l."budgetPlanId" = p."id" AND l."group" = 'DESPESA_PESSOAL'), 0) + 1,
       NOW(), 'AUTOMATICO', 'DECIMO_TERCEIRO'
FROM "budget_plans" p
WHERE NOT EXISTS (SELECT 1 FROM "budget_lines" l WHERE l."budgetPlanId" = p."id" AND l."regraImposto" = 'DECIMO_TERCEIRO');
