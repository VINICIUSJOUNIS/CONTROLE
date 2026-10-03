-- COMPRAS EM R$: cadastros de produtor/fornecedor, padrao e peneira (listas de
-- selecao dos campos, com opcao de cadastrar no proprio lancamento).
-- Peneira digitada com virgula sobrando: "BC," -> "BC".
UPDATE "hedge_registros"
SET "dados" = jsonb_set("dados", '{peneira}', '"BC"'), "updatedAt" = CURRENT_TIMESTAMP
WHERE "aba" = 'compras-em-reais-nayme' AND "dados"->>'peneira' = 'BC,';

-- Cadastra os valores ja usados nos lancamentos.
INSERT INTO "hedge_registros" ("id", "aba", "ordem", "dados", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'cadastro:' || l.cadastro,
       ROW_NUMBER() OVER (PARTITION BY l.cadastro ORDER BY l.nome)::int,
       jsonb_build_object('nome', l.nome), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT c.cadastro, TRIM("dados"->>c.campo) AS nome
  FROM "hedge_registros"
  CROSS JOIN (VALUES ('produtores', 'produtor'), ('padroes', 'padrao'), ('peneiras', 'peneira')) AS c(cadastro, campo)
  WHERE "aba" = 'compras-em-reais-nayme' AND COALESCE(TRIM("dados"->>c.campo), '') <> ''
) l;
