-- Importa as 3 vendas externas de 05/10/2026, a partir do relatorio
-- "VENDA EXTERNO 10-2026.pdf" (CFOP 7102), TELOS IMPORT EXPORT TRADING GMBH -
-- cliente novo. Nenhuma venda de outubro estava gravada.
-- - Conteineres: as 3 notas somam 20.040 kg na mesma data, ou seja, 1
--   conteiner de 20' faturado em 3 notas. Pela regra de antes (ate 22.620 kg =
--   1x20') cada linha viraria 1x20' e contaria 3 conteineres, entao o 1x20'
--   vai so na primeira nota e as outras ficam sem conteiner.
-- - Pais: NULL - o cliente nao tem pais gravado no historico nem no cadastro.
-- Soma: 20.040,00 kg / R$ 604.105,04.
INSERT INTO "sales" ("id", "clientName", "clientType", "quantityKg", "country", "containers20", "containers40", "saleDate", "valueBRL", "valueUSD", "createdAt", "updatedAt") VALUES
('5d2b70d8-9032-4550-beda-a8a4e598f779', 'TELOS IMPORT EXPORT TRADING GMBH', 'EXTERNO', 10020.00, NULL, 1, NULL, '2026-10-05', 354664.21, NULL, '2026-10-15T12:00:00.000Z', '2026-10-15T12:00:00.000Z'),
('b5d2f570-a767-4dda-990d-c3bcf309b15a', 'TELOS IMPORT EXPORT TRADING GMBH', 'EXTERNO', 4980.00, NULL, NULL, NULL, '2026-10-05', 140394.37, NULL, '2026-10-15T12:00:00.000Z', '2026-10-15T12:00:00.000Z'),
('bb30656f-fca1-47de-83d6-7dc1db98091c', 'TELOS IMPORT EXPORT TRADING GMBH', 'EXTERNO', 5040.00, NULL, NULL, NULL, '2026-10-05', 109046.46, NULL, '2026-10-15T12:00:00.000Z', '2026-10-15T12:00:00.000Z');
