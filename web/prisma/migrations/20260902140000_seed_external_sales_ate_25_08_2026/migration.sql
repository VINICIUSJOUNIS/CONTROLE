-- Importa 8 vendas externas de 14/08/2026 a 25/08/2026, a partir do
-- relatorio "faturamento 08-2026 bbbb.pdf".
--
-- O relatorio lista 4 faturas de 14/08/2026 para "APRIN" de 26.400,00kg e
-- R$714.300,21 cada, identicas entre si - mas a importacao anterior
-- (20260814150000_seed_external_sales_ate_14_08_2026) ja gravou 2 dessas 4
-- faturas (grafia "APRIN DIŞ TİCARET LTD. ŞTİ."). Por isso so as 2 faturas
-- restantes entram aqui, com a mesma grafia ja usada nesse dia, para nao
-- duplicar as 2 que ja estavam no banco.
--
-- Relatorio nao discrimina pais/conteineres/valor em USD para essas linhas
-- (so peso, sacas e valor em R$) - ficam NULL, como nas importacoes
-- anteriores sem essa informacao.
--
-- Conferencia: soma das 8 linhas gravadas = 184.000,00 kg e R$ 5.507.981,42.
INSERT INTO "sales" ("id", "clientName", "clientType", "quantityKg", "country", "containers20", "containers40", "saleDate", "valueBRL", "valueUSD", "createdAt", "updatedAt") VALUES
('6a01465c-09a1-4ceb-b01d-e91aa76b4388', 'APRIN DIŞ TİCARET LTD. ŞTİ.', 'EXTERNO', 26400.00, NULL, NULL, NULL, '2026-08-14', 714300.21, NULL, '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z'),
('2d95a7bc-f006-4bd9-b37b-283b4a2a6ffc', 'APRIN DIŞ TİCARET LTD. ŞTİ.', 'EXTERNO', 26400.00, NULL, NULL, NULL, '2026-08-14', 714300.21, NULL, '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z'),
('a634b776-aeca-4dff-a34a-eaa719f1b7b4', 'DEFNEM GUMRUK MUSAVIRLIGI LOJISTIK IC VE DIS TICARET LTD. STI.', 'EXTERNO', 26400.00, NULL, NULL, NULL, '2026-08-19', 730849.26, NULL, '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z'),
('461a2f26-bb4b-4784-b3e3-44c6b37d3e6a', 'COASTAL COMMODITES LLC', 'EXTERNO', 20000.00, NULL, NULL, NULL, '2026-08-19', 635569.50, NULL, '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z'),
('0acf1d61-42f7-42e0-8eeb-965793e6bca4', 'COASTAL COMMODITES LLC', 'EXTERNO', 20000.00, NULL, NULL, NULL, '2026-08-19', 635569.50, NULL, '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z'),
('de14f7a5-b39b-4a6d-9bba-fade62155691', 'DEFNEM GUMRUK MUSAVIRLIGI LOJISTIK IC VE DIS TICARET LTD. STI.', 'EXTERNO', 26400.00, NULL, NULL, NULL, '2026-08-20', 726228.52, NULL, '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z'),
('0e9e5d4d-55a6-4bbf-84a5-1bc09f4b78fb', 'VOLCAFE LTDA', 'EXTERNO', 19200.00, NULL, NULL, NULL, '2026-08-25', 675582.11, NULL, '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z'),
('47f89309-d6a0-4732-ad20-ab5a5872e120', 'VOLCAFE LTDA', 'EXTERNO', 19200.00, NULL, NULL, NULL, '2026-08-25', 675582.11, NULL, '2026-09-02T12:00:00.000Z', '2026-09-02T12:00:00.000Z');
