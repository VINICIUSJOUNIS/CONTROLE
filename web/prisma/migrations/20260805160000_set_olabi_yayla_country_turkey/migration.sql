-- OLABI e YAYLA sao clientes turcos (nome de empresa no padrao "... Gida
-- Sanayi ve Ticaret A.S.", comum em razao social turca; OLABI ja aparecia
-- como Turquia em vendas anteriores). Preenche o pais so onde ainda esta
-- NULL, sem sobrescrever nenhum valor ja cadastrado.

UPDATE "sales"
SET "country" = '792'
WHERE "clientType" = 'EXTERNO'
  AND "country" IS NULL
  AND "clientName" IN (
    'OLABI OVERSA COFFEE BAHARAT GIDA IC VE DIS TICARET LIMITED',
    'YAYLA AGRO GIDA SANAYI VE TICARET AS'
  );
