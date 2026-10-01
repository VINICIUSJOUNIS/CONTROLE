-- Preenche o pais das 10 vendas externas importadas em
-- 20261001090000_seed_external_sales_ate_30_09_2026 (gravadas com NULL),
-- usando o mesmo codigo ISO 3166-1 numerico das vendas anteriores de cada
-- cliente: COASTAL COMMODITES LLC = 840, CPO INC. = 410, SOCIETE ETS MICHEL
-- NAJJAR SAL = 422, SUCAFINA SA = 840.
UPDATE "sales" SET "country" = '840', "updatedAt" = NOW() WHERE "id" IN ('97185bc5-89d1-47c3-ab8b-c092b5dc67b9','5dad6677-ff60-48a1-b380-099d247af6a6') AND "country" IS NULL;
UPDATE "sales" SET "country" = '410', "updatedAt" = NOW() WHERE "id" IN ('6e41783c-a41f-4ae7-a679-258d17f96247','b2471b15-8210-4676-9075-313bb42eaabb','90dfe416-0e2d-4bdc-8167-848698cb13e5') AND "country" IS NULL;
UPDATE "sales" SET "country" = '422', "updatedAt" = NOW() WHERE "id" IN ('3d3b2274-db71-4308-8d1a-7705c85cd3aa','64b62f47-6c39-4141-a47a-a33490af8e6e','6884b89c-0962-43f9-93d9-02d8659f5869') AND "country" IS NULL;
UPDATE "sales" SET "country" = '840', "updatedAt" = NOW() WHERE "id" IN ('14f4287e-3e14-456b-b270-8e1e26084f44','b21529b0-bf02-43b8-8817-1b865a19971b') AND "country" IS NULL;
