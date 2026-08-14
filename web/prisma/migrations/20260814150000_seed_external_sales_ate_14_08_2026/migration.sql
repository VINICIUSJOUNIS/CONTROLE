-- Importa 5 vendas externas de 03/08/2026 a 14/08/2026, a partir do
-- relatorio "VENDAS EXTERNO ATE 14-08-2026.pdf". Nao ha overlap com a ultima
-- importacao externa de 2026 (20260805110000), que vai ate 24/07/2026.
-- Relatorio nao discrimina pais/conteineres/valor em USD para essas linhas
-- (so peso, sacas e valor em R$) - ficaram NULL, como as demais vendas sem
-- essa informacao.

INSERT INTO "sales" ("id", "clientName", "clientType", "quantityKg", "country", "containers20", "containers40", "saleDate", "valueBRL", "valueUSD", "createdAt", "updatedAt") VALUES
('0d92de42-3c74-4c56-89dd-77c7ef5c4bf7', 'KYUNG MIN CO. LTD', 'EXTERNO', 19200.00, NULL, NULL, NULL, '2026-08-03', 640386.14, NULL, '2026-08-14T15:00:00.000Z', '2026-08-14T15:00:00.000Z'),
('89399c2e-0a03-4cb0-b99a-68510b124869', 'EASTERN COFFEE COMPANY', 'EXTERNO', 19200.00, NULL, NULL, NULL, '2026-08-03', 648981.91, NULL, '2026-08-14T15:00:00.000Z', '2026-08-14T15:00:00.000Z'),
('f4f4ce9e-ee46-4426-9cec-7278d8e2de42', 'EASTERN COFFEE COMPANY', 'EXTERNO', 19200.00, NULL, NULL, NULL, '2026-08-03', 648981.91, NULL, '2026-08-14T15:00:00.000Z', '2026-08-14T15:00:00.000Z'),
('968d02b8-dfcf-470e-b612-f29a88ee9a99', 'APRIN DIŞ TİCARET LTD. ŞTİ.', 'EXTERNO', 26400.00, NULL, NULL, NULL, '2026-08-14', 714300.21, NULL, '2026-08-14T15:00:00.000Z', '2026-08-14T15:00:00.000Z'),
('92a75a75-a229-4cab-9842-fcb93f635c29', 'APRIN DIŞ TİCARET LTD. ŞTİ.', 'EXTERNO', 26400.00, NULL, NULL, NULL, '2026-08-14', 714300.21, NULL, '2026-08-14T15:00:00.000Z', '2026-08-14T15:00:00.000Z');
