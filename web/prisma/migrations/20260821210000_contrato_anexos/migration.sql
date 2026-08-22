-- CreateTable
CREATE TABLE "contrato_anexos" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "etapa" "StatusContrato" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contrato_anexos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contrato_anexos_contratoId_idx" ON "contrato_anexos"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_anexos_etapa_idx" ON "contrato_anexos"("etapa");

-- AddForeignKey
ALTER TABLE "contrato_anexos" ADD CONSTRAINT "contrato_anexos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
