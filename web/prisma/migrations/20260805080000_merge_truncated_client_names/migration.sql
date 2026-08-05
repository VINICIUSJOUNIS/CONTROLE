-- Corrige o duplicado que aparecia como #1 e #2 em "Maiores Clientes -
-- Mercado Interno": o import de 2025 (PDF) trouxe o nome cortado
-- "COOPERATIVA REGIONAL DE CAFEICUL", enquanto o import de 2023-2024
-- (planilha) trouxe o nome completo da mesma cooperativa (COOXUPE).
-- Varredura por prefixo/similaridade encontrou mais dois pares: COPA CAFE
-- COMERCIO E EXPORTACAO L(TDA) / LTDA., e COMERCIO ATACADISTA (DE CAFE)
-- MUNDO NOVO L(TDA) - este ultimo nao e prefixo simples (o relatorio
-- cortou "DE CAFE" do meio do nome, nao so o final).

UPDATE "sales" SET "clientName" = 'COOPERATIVA REGIONAL DE CAFEICULTORES EM GUAXUPE LTDA COOXUPE' WHERE "clientName" = 'COOPERATIVA REGIONAL DE CAFEICUL';
UPDATE "sales" SET "clientName" = 'COPA CAFE COMERCIO E EXPORTACAO LTDA.' WHERE "clientName" = 'COPA CAFE COMERCIO E EXPORTACAO L';
UPDATE "sales" SET "clientName" = 'COMERCIO ATACADISTA DE CAFE MUNDO NOVO LTDA' WHERE "clientName" = 'COMERCIO ATACADISTA MUNDO NOVO L';
