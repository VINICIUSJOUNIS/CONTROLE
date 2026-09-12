-- Importa 8 vendas externas de 10/09/2026 a 11/09/2026, a partir do
-- relatorio "VENDAS EXTERNO ATE 11-09-2026.pdf". Sem overlap com a ultima
-- venda externa gravada (VOLCAFE LTDA, 2026-08-25).
--
-- Pais e conteineres nao vem no relatorio (so data, cliente, peso e valor em
-- R$), entao foram preenchidos por inferencia:
-- - Conteineres: peso ate 21.600kg = 1x20', peso a partir de 25.800kg = 1x40'
--   (padrao observado em todo o historico de vendas externas ja gravado:
--   19.200-21.600kg sempre containers20=1, 26.400kg sempre containers40=1).
-- - Pais: puxado do historico de vendas do mesmo cliente (codigo numerico
--   ISO 3166-1, mesmo padrao ja usado na base) quando ha correspondencia
--   exata de nome: SHAREKAT WROOD AMRO LLSELA = '376' (Israel, 4 vendas
--   anteriores identicas a 26.400kg) e EASTERN COFFEE COMPANY = '410'
--   (Coreia do Sul, 14 vendas anteriores). "SUCAFINA SA" nao tem
--   correspondencia exata no historico (so "SUCAFINA NA INC", pais '840',
--   e "SUCAFINA BRASIL...", outra entidade sem pais) - ficou NULL para nao
--   supor um pais nao confirmado.
INSERT INTO "sales" ("id", "clientName", "clientType", "quantityKg", "country", "containers20", "containers40", "saleDate", "valueBRL", "valueUSD", "createdAt", "updatedAt") VALUES
('f3787521-d838-41ca-8a17-1c3f7ce1ca21', 'SUCAFINA SA', 'EXTERNO', 28800.00, NULL, NULL, 1, '2026-09-10', 893005.86, NULL, '2026-09-12T09:00:00.000Z', '2026-09-12T09:00:00.000Z'),
('91f8cc21-9a2b-49a8-ad83-01eb449fade4', 'SUCAFINA SA', 'EXTERNO', 28800.00, NULL, NULL, 1, '2026-09-10', 893005.86, NULL, '2026-09-12T09:00:00.000Z', '2026-09-12T09:00:00.000Z'),
('864d74c8-14db-4662-8391-8080a5b94783', 'SHAREKAT WROOD AMRO LLSELA', 'EXTERNO', 26400.00, '376', NULL, 1, '2026-09-10', 877613.88, NULL, '2026-09-12T09:00:00.000Z', '2026-09-12T09:00:00.000Z'),
('0caeb29c-da3b-45e7-b6a6-934c6f43588b', 'SHAREKAT WROOD AMRO LLSELA', 'EXTERNO', 26400.00, '376', NULL, 1, '2026-09-10', 877613.88, NULL, '2026-09-12T09:00:00.000Z', '2026-09-12T09:00:00.000Z'),
('f4b41ff9-2da9-417b-b433-22e64440643d', 'EASTERN COFFEE COMPANY', 'EXTERNO', 19200.00, '410', 1, NULL, '2026-09-11', 676265.51, NULL, '2026-09-12T09:00:00.000Z', '2026-09-12T09:00:00.000Z'),
('b592259f-4bc1-475d-9bbd-fc4efcd7511d', 'EASTERN COFFEE COMPANY', 'EXTERNO', 25800.00, '410', NULL, 1, '2026-09-11', 943482.55, NULL, '2026-09-12T09:00:00.000Z', '2026-09-12T09:00:00.000Z'),
('54baf9a1-6373-40db-be06-4b2eaaa30a8b', 'EASTERN COFFEE COMPANY', 'EXTERNO', 25800.00, '410', NULL, 1, '2026-09-11', 943482.55, NULL, '2026-09-12T09:00:00.000Z', '2026-09-12T09:00:00.000Z'),
('a913468e-4aef-4a4d-afab-c75c2bdf8d16', 'EASTERN COFFEE COMPANY', 'EXTERNO', 25800.00, '410', NULL, 1, '2026-09-11', 943482.55, NULL, '2026-09-12T09:00:00.000Z', '2026-09-12T09:00:00.000Z');
