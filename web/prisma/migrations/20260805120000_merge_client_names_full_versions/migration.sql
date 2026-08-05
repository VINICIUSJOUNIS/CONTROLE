-- O relatorio "cliente internos 2026.pdf" (formato novo, sem corte de coluna)
-- trouxe o nome completo de varios clientes que so tinhamos com nome cortado
-- de imports anteriores (relatorios de coluna estreita). Atualiza os
-- registros ja existentes para o nome completo antes de inserir as vendas
-- novas com o mesmo nome, evitando recriar a duplicidade.

UPDATE "sales" SET "clientName" = 'AGRO FORTE IMPORTACAO E EXPORTACAO DE CAFE LTDA' WHERE "clientName" = 'AGRO FORTE IMPORTACAO E EXPORTAC';
UPDATE "sales" SET "clientName" = 'COOPERATIVA AGROINDUSTRIAL DE VARGINHA LTDA' WHERE "clientName" = 'COOPERATIVA AGROINDUSTRIAL DE VA';
UPDATE "sales" SET "clientName" = 'COSTA CAFE COMERCIO EXPORTACAO E IMPORTACAO LTDA' WHERE "clientName" = 'COSTA CAFE - COMERCIO EXPORTACAO';
UPDATE "sales" SET "clientName" = 'GARDINGO TRADE IMPORTACAO E EXPORTACAO LTDA' WHERE "clientName" = 'GARDINGO TRADE IMP. E EXP. LTDA';
UPDATE "sales" SET "clientName" = 'J. R. COMERCIO E EXPORTACAO DE CAFE LTDA' WHERE "clientName" = 'JR COMERCIO E EXPORTACAO DE CAFE L';
UPDATE "sales" SET "clientName" = 'NICCHIO CAFE S/A EXPORTACAO E IMPORTACAO' WHERE "clientName" = 'NICCHIO CAFE S/A EXPORTACAO E IMPO';
UPDATE "sales" SET "clientName" = 'ODEBRECHT COMERCIO E INDUSTRIA DE CAFE LTDA' WHERE "clientName" = 'ODEBRECHT COMERCIO E INDUSTRIA D';
UPDATE "sales" SET "clientName" = 'SUCAFINA BRASIL INDUSTRIA, COMERCIO E EXPORTACAO LTDA.' WHERE "clientName" = 'SUCAFINA BRASIL INDUSTRIA, COMERCI';
UPDATE "sales" SET "clientName" = 'TPJ COMERCIO ATACADISTA DE CAFE IMPORTACAO E EXPORTACAO LTDA' WHERE "clientName" = 'TPJ COMERCIO ATACADISTA DE CAFE IMPORTACAO E EXPOR';
UPDATE "sales" SET "clientName" = 'TRISTAO COMPANHIA DE COMERCIO EXTERIOR' WHERE "clientName" = 'TRISTAO COMPANHIA DE COMERCIO EX';
UPDATE "sales" SET "clientName" = 'UNICAFE COMPANHIA DE COMERCIO EXTERIOR' WHERE "clientName" = 'UNICAFE COMPANHIA DE COMERCIO EX';
