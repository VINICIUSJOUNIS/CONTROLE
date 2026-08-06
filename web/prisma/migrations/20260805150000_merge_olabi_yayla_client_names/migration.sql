-- Unifica clientes que ficaram com nome cortado nas importacoes de 2025
-- (relatorio de coluna estreita) com o nome completo trazido pela
-- importacao de 2026 (relatorio sem corte de coluna).

UPDATE "sales" SET "clientName" = 'OLABI OVERSA COFFEE BAHARAT GIDA IC VE DIS TICARET LIMITED' WHERE "clientName" = 'OLABI OVERSA COFFEE BAHARAT GIDA I';
UPDATE "sales" SET "clientName" = 'YAYLA AGRO GIDA SANAYI VE TICARET AS' WHERE "clientName" = 'YAYLA AGRO GIDA SANAYI VE TICARET A';
