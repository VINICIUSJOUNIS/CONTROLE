-- CreateTable
CREATE TABLE "tipos_embalagem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_embalagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_embalagem_name_key" ON "tipos_embalagem"("name");

-- AlterTable: troca o texto livre "tipoEmbalagem" por uma referencia a
-- tipos_embalagem (lista cadastravel).
ALTER TABLE "contrato_confirmacao_negocio" DROP COLUMN "tipoEmbalagem";
ALTER TABLE "contrato_confirmacao_negocio" ADD COLUMN "tipoEmbalagemId" TEXT;

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_tipoEmbalagemId_idx" ON "contrato_confirmacao_negocio"("tipoEmbalagemId");

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_tipoEmbalagemId_fkey" FOREIGN KEY ("tipoEmbalagemId") REFERENCES "tipos_embalagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
