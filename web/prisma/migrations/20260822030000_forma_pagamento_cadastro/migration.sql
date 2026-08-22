-- CreateTable
CREATE TABLE "formas_pagamento" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "formas_pagamento_name_key" ON "formas_pagamento"("name");

-- Preserva qualquer valor de texto livre ja cadastrado, criando um registro
-- correspondente na nova lista.
INSERT INTO "formas_pagamento" ("id", "name")
SELECT gen_random_uuid()::text, v.name
FROM (
  SELECT DISTINCT trim("formaPagamento") AS name
  FROM "contrato_confirmacao_negocio"
  WHERE "formaPagamento" IS NOT NULL AND trim("formaPagamento") <> ''
) AS v;

-- AlterTable: troca o texto livre "formaPagamento" por uma referencia a
-- formas_pagamento (lista cadastravel).
ALTER TABLE "contrato_confirmacao_negocio" ADD COLUMN "formaPagamentoId" TEXT;

UPDATE "contrato_confirmacao_negocio" ccn
SET "formaPagamentoId" = fp.id
FROM "formas_pagamento" fp
WHERE fp.name = trim(ccn."formaPagamento");

ALTER TABLE "contrato_confirmacao_negocio" DROP COLUMN "formaPagamento";

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_formaPagamentoId_idx" ON "contrato_confirmacao_negocio"("formaPagamentoId");

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_formaPagamentoId_fkey" FOREIGN KEY ("formaPagamentoId") REFERENCES "formas_pagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
