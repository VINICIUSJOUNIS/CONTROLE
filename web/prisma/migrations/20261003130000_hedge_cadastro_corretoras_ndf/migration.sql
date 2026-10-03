-- TRAVA NDF: cadastro de corretoras (lista de selecao do campo CORRETORA).
-- 1) Unifica grafias da mesma corretora nos lancamentos importados:
--    "BANCO ABC" -> "ABC" e "C6 -" -> "C6".
UPDATE "hedge_registros"
SET "dados" = jsonb_set("dados", '{corretora}', '"ABC"'), "updatedAt" = CURRENT_TIMESTAMP
WHERE "aba" = 'trava-ndf-us-nayme' AND "dados"->>'corretora' = 'BANCO ABC';

UPDATE "hedge_registros"
SET "dados" = jsonb_set("dados", '{corretora}', '"C6"'), "updatedAt" = CURRENT_TIMESTAMP
WHERE "aba" = 'trava-ndf-us-nayme' AND "dados"->>'corretora' = 'C6 -';

-- 2) Cadastra as corretoras ja usadas nos lancamentos.
INSERT INTO "hedge_registros" ("id", "aba", "ordem", "dados", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'cadastro:corretoras-ndf',
       ROW_NUMBER() OVER (ORDER BY nome)::int,
       jsonb_build_object('nome', nome), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT UPPER(TRIM("dados"->>'corretora')) AS nome
  FROM "hedge_registros"
  WHERE "aba" = 'trava-ndf-us-nayme' AND COALESCE(TRIM("dados"->>'corretora'), '') <> ''
) c;
