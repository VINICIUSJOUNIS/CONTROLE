-- CreateTable
CREATE TABLE "tipos_frete" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_frete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_frete_name_key" ON "tipos_frete"("name");

-- Preserva qualquer valor de texto livre ja cadastrado, criando um registro
-- correspondente na nova lista.
INSERT INTO "tipos_frete" ("id", "name")
SELECT gen_random_uuid()::text, v.name
FROM (
  SELECT DISTINCT trim("frete") AS name
  FROM "contrato_confirmacao_negocio"
  WHERE "frete" IS NOT NULL AND trim("frete") <> ''
) AS v;

-- AlterTable: troca o texto livre "frete" por uma referencia a tipos_frete
-- (lista cadastravel).
ALTER TABLE "contrato_confirmacao_negocio" ADD COLUMN "tipoFreteId" TEXT;

UPDATE "contrato_confirmacao_negocio" ccn
SET "tipoFreteId" = tf.id
FROM "tipos_frete" tf
WHERE tf.name = trim(ccn."frete");

ALTER TABLE "contrato_confirmacao_negocio" DROP COLUMN "frete";

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_tipoFreteId_idx" ON "contrato_confirmacao_negocio"("tipoFreteId");

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_tipoFreteId_fkey" FOREIGN KEY ("tipoFreteId") REFERENCES "tipos_frete"("id") ON DELETE SET NULL ON UPDATE CASCADE;
