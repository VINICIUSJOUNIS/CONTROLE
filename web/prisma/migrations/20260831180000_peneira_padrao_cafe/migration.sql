-- DropForeignKey
ALTER TABLE "contrato_confirmacao_negocio" DROP CONSTRAINT "contrato_confirmacao_negocio_descricaoCafeId_fkey";

-- DropIndex
DROP INDEX "contrato_confirmacao_negocio_descricaoCafeId_idx";

-- AlterTable: substitui "Descricao do Cafe" (um campo livre) por Peneira
-- e Padrao (duas listas cadastraveis separadas).
ALTER TABLE "contrato_confirmacao_negocio" DROP COLUMN "descricaoCafeId";
ALTER TABLE "contrato_confirmacao_negocio" ADD COLUMN "peneiraId" TEXT;
ALTER TABLE "contrato_confirmacao_negocio" ADD COLUMN "padraoId" TEXT;

-- DropTable
DROP TABLE "descricoes_cafe";

-- CreateTable
CREATE TABLE "peneiras" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peneiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "padroes_cafe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "padroes_cafe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "peneiras_name_key" ON "peneiras"("name");

-- CreateIndex
CREATE UNIQUE INDEX "padroes_cafe_name_key" ON "padroes_cafe"("name");

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_peneiraId_idx" ON "contrato_confirmacao_negocio"("peneiraId");

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_padraoId_idx" ON "contrato_confirmacao_negocio"("padraoId");

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_peneiraId_fkey" FOREIGN KEY ("peneiraId") REFERENCES "peneiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_padraoId_fkey" FOREIGN KEY ("padraoId") REFERENCES "padroes_cafe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
