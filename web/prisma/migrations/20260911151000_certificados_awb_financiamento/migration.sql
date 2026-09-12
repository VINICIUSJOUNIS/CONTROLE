-- CreateTable
CREATE TABLE "contrato_certificados" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_awb_documentacao" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "awbNumero" TEXT,
    "awbValor" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_awb_documentacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contrato_certificados_contratoId_idx" ON "contrato_certificados"("contratoId");

-- CreateIndex
CREATE UNIQUE INDEX "contrato_awb_documentacao_contratoId_key" ON "contrato_awb_documentacao"("contratoId");

-- AddForeignKey
ALTER TABLE "contrato_certificados" ADD CONSTRAINT "contrato_certificados_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_awb_documentacao" ADD CONSTRAINT "contrato_awb_documentacao_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
