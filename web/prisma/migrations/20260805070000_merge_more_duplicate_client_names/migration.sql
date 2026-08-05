-- Continuacao da unificacao de clientes duplicados (pedido pelo usuario:
-- ouro minas, renascer, tpj, union, vequis). Esses nomes divergem porque um
-- dos imports veio de relatorio em PDF de coluna estreita, que corta o nome
-- no meio (ex.: "...E EXPO", "...IMPORTAC"). Mantido o nome mais completo de
-- cada par (nao necessariamente o mais frequente); quando nenhuma das duas
-- grafias esta 100% completa (TPJ), mantida a menos truncada.

UPDATE "sales" SET "clientName" = 'OURO MINAS ARMAZENS GERAIS E COMERCIO DE CAFE LTDA' WHERE "clientName" = 'OURO MINAS ARMAZENS GERAIS E COM';
UPDATE "sales" SET "clientName" = 'RENASCER EXP. E IMP. LTDA' WHERE "clientName" = 'RENASCER EXPORTACAO E IMPORTACA';
UPDATE "sales" SET "clientName" = 'TPJ COMERCIO ATACADISTA DE CAFE IMPORTACAO E EXPOR' WHERE "clientName" = 'TPJ COM ATAC DE CAFE IMPORT E EXPO';
UPDATE "sales" SET "clientName" = 'UNION TRADING COMERCIO, IMPORTACAO E EXPORTACAO LTDA.' WHERE "clientName" = 'UNION TRADING COMERCIO, IMPORTAC';
UPDATE "sales" SET "clientName" = 'VEQUIS COMERCIO IMPORTACAO E EXPORTACAO LTDA' WHERE "clientName" = 'VEQUIS COMERCIO IMPORTACAO E EXP';
