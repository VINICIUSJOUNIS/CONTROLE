-- Unifica o nome cortado de 2025 com o nome completo trazido pela
-- importacao de 2026, e preenche o pais (Turquia - nome de empresa no
-- padrao "... Gida San. A.S.", razao social turca) so onde ainda esta NULL.

UPDATE "sales" SET "clientName" = 'EMSAL SEKERLEME KURUYEMIS GIDA SAN.A.S.' WHERE "clientName" = 'EMSAL SEKERLEME KURUYEMIS GIDA S';

UPDATE "sales"
SET "country" = '792'
WHERE "clientType" = 'EXTERNO'
  AND "country" IS NULL
  AND "clientName" = 'EMSAL SEKERLEME KURUYEMIS GIDA SAN.A.S.';
