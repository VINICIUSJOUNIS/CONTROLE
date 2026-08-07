-- "Diferencial" precisa ser numerico para calcular medias (por cliente,
-- pais, geral) - estava como texto livre. Converte o que ja estiver
-- preenchido com um numero valido; qualquer texto nao numerico vira NULL
-- (nao deve haver nenhum, o campo acabou de ser criado).

ALTER TABLE "sales"
  ALTER COLUMN "diferencial" TYPE DECIMAL(10, 4)
  USING (
    CASE
      WHEN "diferencial" ~ '^-?[0-9]+(\.[0-9]+)?$' THEN "diferencial"::DECIMAL(10, 4)
      ELSE NULL
    END
  );
