-- Importa 5 devolucoes de vendas do mercado externo de 04/09/2026 a
-- 22/09/2026, a partir do relatorio "dev venda mercado externo.pdf".
-- clientName grafado exatamente como nas vendas ja gravadas, para que
-- getSaleReturns resolva o tipo EXTERNO pelo nome (APRIN usa a grafia
-- "DIŞ TICARET LTD. ŞTI.", a mesma das 7 vendas gravadas com essa grafia).
-- Soma: 130.400,00 kg / R$ 3.843.464,16.
INSERT INTO "sale_returns" ("id", "clientName", "quantityKg", "returnDate", "valueBRL", "createdAt", "updatedAt") VALUES
('e9de01f1-8b49-41fe-9979-17108df720ca', 'COASTAL COMMODITES LLC', 20000.00, '2026-09-04', 636961.36, '2026-10-01T09:00:00.000Z', '2026-10-01T09:00:00.000Z'),
('cbe35d6c-a8cc-4ff5-9ff2-dd0854fc6040', 'SUCAFINA SA', 28800.00, '2026-09-17', 893005.86, '2026-10-01T09:00:00.000Z', '2026-10-01T09:00:00.000Z'),
('f591b52e-b0cf-4472-bf55-2567db7c6dc9', 'SUCAFINA SA', 28800.00, '2026-09-17', 893005.86, '2026-10-01T09:00:00.000Z', '2026-10-01T09:00:00.000Z'),
('82135e79-a070-4359-aae3-2b0b3985a126', 'APRIN DIŞ TICARET LTD. ŞTI.', 26400.00, '2026-09-22', 710245.54, '2026-10-01T09:00:00.000Z', '2026-10-01T09:00:00.000Z'),
('3d50c051-50a0-42ba-9ee0-1893b9ee6d04', 'APRIN DIŞ TICARET LTD. ŞTI.', 26400.00, '2026-09-22', 710245.54, '2026-10-01T09:00:00.000Z', '2026-10-01T09:00:00.000Z');
