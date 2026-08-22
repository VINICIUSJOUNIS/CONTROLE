-- CreateTable
CREATE TABLE "contrato_etapa_concluida" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "etapa" "StatusContrato" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contrato_etapa_concluida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrato_etapa_concluida_contratoId_etapa_key" ON "contrato_etapa_concluida"("contratoId", "etapa");

-- AddForeignKey
ALTER TABLE "contrato_etapa_concluida" ADD CONSTRAINT "contrato_etapa_concluida_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
