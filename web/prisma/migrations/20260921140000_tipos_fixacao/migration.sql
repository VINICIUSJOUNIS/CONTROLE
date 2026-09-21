-- CreateTable
CREATE TABLE "tipos_fixacao" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_fixacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_fixacao_name_key" ON "tipos_fixacao"("name");

-- Tipos que ja existiam como valor fixo (Buyer/Seller)
INSERT INTO "tipos_fixacao" ("id", "name") VALUES
  (gen_random_uuid()::text, 'Buyer'),
  (gen_random_uuid()::text, 'Seller');

-- AlterTable
ALTER TABLE "contrato_confirmacao_negocio" ADD COLUMN "fixacaoTipoId" TEXT;

-- Preserva a fixacao ja lancada nos contratos existentes
UPDATE "contrato_confirmacao_negocio" c
SET "fixacaoTipoId" = t."id"
FROM "tipos_fixacao" t
WHERE (c."fixacaoTipo" = 'BUYER' AND t."name" = 'Buyer')
   OR (c."fixacaoTipo" = 'SELLER' AND t."name" = 'Seller');

ALTER TABLE "contrato_confirmacao_negocio" DROP COLUMN "fixacaoTipo";

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_fixacaoTipoId_idx" ON "contrato_confirmacao_negocio"("fixacaoTipoId");

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_fixacaoTipoId_fkey" FOREIGN KEY ("fixacaoTipoId") REFERENCES "tipos_fixacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
