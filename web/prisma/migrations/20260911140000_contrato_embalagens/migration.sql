-- CreateTable
CREATE TABLE "contrato_embalagens" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipoEmbalagemId" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "valorUnitario" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_embalagens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contrato_embalagens_contratoId_idx" ON "contrato_embalagens"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_embalagens_tipoEmbalagemId_idx" ON "contrato_embalagens"("tipoEmbalagemId");

-- AddForeignKey
ALTER TABLE "contrato_embalagens" ADD CONSTRAINT "contrato_embalagens_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_embalagens" ADD CONSTRAINT "contrato_embalagens_tipoEmbalagemId_fkey" FOREIGN KEY ("tipoEmbalagemId") REFERENCES "tipos_embalagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
