-- Preenche o pais das vendas externas que ficaram sem pais na importacao
-- (ex: vendas de 2026 vindas de relatorio sem coluna de destino), usando o
-- pais de qualquer outra venda do mesmo cliente que ja tenha pais
-- cadastrado (seja da importacao original ou de edicao manual via UI).
--
-- So preenche onde esta NULL - nunca sobrescreve um pais ja cadastrado.
-- Clientes sem nenhuma venda com pais cadastrado permanecem NULL, para
-- preenchimento manual.

UPDATE "sales" AS target
SET "country" = source."country"
FROM (
  SELECT DISTINCT ON ("clientName") "clientName", "country"
  FROM "sales"
  WHERE "clientType" = 'EXTERNO' AND "country" IS NOT NULL
) AS source
WHERE target."clientType" = 'EXTERNO'
  AND target."country" IS NULL
  AND target."clientName" = source."clientName";
