-- CreateTable
CREATE TABLE "descricoes_cafe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "descricoes_cafe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "descricoes_cafe_name_key" ON "descricoes_cafe"("name");

-- AlterTable: troca o texto livre "descricaoCafe" por uma referencia a
-- descricoes_cafe (lista cadastravel).
ALTER TABLE "contrato_confirmacao_negocio" DROP COLUMN "descricaoCafe";
ALTER TABLE "contrato_confirmacao_negocio" ADD COLUMN "descricaoCafeId" TEXT;

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_descricaoCafeId_idx" ON "contrato_confirmacao_negocio"("descricaoCafeId");

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_descricaoCafeId_fkey" FOREIGN KEY ("descricaoCafeId") REFERENCES "descricoes_cafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
