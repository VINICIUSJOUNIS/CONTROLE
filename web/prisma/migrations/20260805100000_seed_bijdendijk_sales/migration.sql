-- Importa 6 vendas externas do cliente G. Bijdendijk BV (Holanda/Belgica),
-- informadas manualmente pelo usuario (2 embarques em 03/02/2024 e 26/02/2024
-- para a Holanda, 2 em 20/03/2024 para a Belgica). Quantidade informada como
-- 320 (sacas de 60kg = 19.200 kg, o mesmo padrao de conteiner de 20 pes ja
-- usado no resto da base) - conteiner atribuido pela mesma regra dos outros
-- imports (< 440 sacas = 1 conteiner de 20 pes). Valor (R$) ainda nao
-- informado pelo usuario, fica 0,00 por enquanto - editar depois na tela de
-- Vendas quando o valor estiver disponivel.

INSERT INTO "sales" ("id", "clientName", "clientType", "quantityKg", "country", "containers20", "containers40", "saleDate", "valueBRL", "valueUSD", "createdAt", "updatedAt") VALUES
('f0a0321e-9127-4416-a91e-49a4a0aea4ed', 'G. Bijdendijk BV', 'EXTERNO', 19200.00, '528', 1, NULL, '2024-02-03', 0.00, NULL, '2026-08-05T17:20:35.000Z', '2026-08-05T17:20:35.000Z'),
('a98fa64c-db18-4261-85d2-c75a4335ffb7', 'G. Bijdendijk BV', 'EXTERNO', 19200.00, '528', 1, NULL, '2024-02-03', 0.00, NULL, '2026-08-05T17:20:35.000Z', '2026-08-05T17:20:35.000Z'),
('d773ebe3-d054-4a57-ac58-688f215516fa', 'G. Bijdendijk BV', 'EXTERNO', 19200.00, '528', 1, NULL, '2024-02-26', 0.00, NULL, '2026-08-05T17:20:35.000Z', '2026-08-05T17:20:35.000Z'),
('84b7b6a0-7429-4dbd-b59e-0d96245af5ed', 'G. Bijdendijk BV', 'EXTERNO', 19200.00, '528', 1, NULL, '2024-02-26', 0.00, NULL, '2026-08-05T17:20:35.000Z', '2026-08-05T17:20:35.000Z'),
('929b26bc-ed0c-4574-926a-4532cb599736', 'G. Bijdendijk BV', 'EXTERNO', 19200.00, '056', 1, NULL, '2024-03-20', 0.00, NULL, '2026-08-05T17:20:35.000Z', '2026-08-05T17:20:35.000Z'),
('17230e09-9b40-4179-93a4-3dc4cb711be5', 'G. Bijdendijk BV', 'EXTERNO', 19200.00, '056', 1, NULL, '2024-03-20', 0.00, NULL, '2026-08-05T17:20:35.000Z', '2026-08-05T17:20:35.000Z');
