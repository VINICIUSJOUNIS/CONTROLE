-- Unifica clientes que foram gravados com nomes ligeiramente diferentes em
-- importacoes distintas (pontuacao/abreviacao de sufixo societario), o que os
-- fazia aparecer como clientes separados nos rankings e filtros. Mantido o
-- nome mais frequente entre as duas grafias de cada cliente.
--
-- BOURBON SPECIALTY COFFEES S/A -> BOURBON SPECIALTY COFFEES SA (apontado pelo usuario)
-- CAFE TRES CORACOES S/A -> CAFE TRES CORACOES S.A (apontado pelo usuario)
-- GARDINGO TRADE IMP. E EXP LTDA -> GARDINGO TRADE IMP. E EXP. LTDA (achado na mesma varredura)
-- NKG STOCKLER LTDA. -> NKG STOCKLER LTDA (achado na mesma varredura)
-- OLAM AGRICOLA LTDA. -> OLAM AGRICOLA LTDA (achado na mesma varredura)

UPDATE "sales" SET "clientName" = 'BOURBON SPECIALTY COFFEES SA' WHERE "clientName" = 'BOURBON SPECIALTY COFFEES S/A';
UPDATE "sales" SET "clientName" = 'CAFE TRES CORACOES S.A' WHERE "clientName" = 'CAFE TRES CORACOES S/A';
UPDATE "sales" SET "clientName" = 'GARDINGO TRADE IMP. E EXP. LTDA' WHERE "clientName" = 'GARDINGO TRADE IMP. E EXP LTDA';
UPDATE "sales" SET "clientName" = 'NKG STOCKLER LTDA' WHERE "clientName" = 'NKG STOCKLER LTDA.';
UPDATE "sales" SET "clientName" = 'OLAM AGRICOLA LTDA' WHERE "clientName" = 'OLAM AGRICOLA LTDA.';
