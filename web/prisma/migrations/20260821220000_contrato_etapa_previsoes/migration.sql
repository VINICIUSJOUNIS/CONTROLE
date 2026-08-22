-- CreateTable
CREATE TABLE "contrato_etapa_previsoes" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "etapa" "StatusContrato" NOT NULL,
    "dataPrevisao" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_etapa_previsoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrato_etapa_previsoes_contratoId_etapa_key" ON "contrato_etapa_previsoes"("contratoId", "etapa");

-- AddForeignKey
ALTER TABLE "contrato_etapa_previsoes" ADD CONSTRAINT "contrato_etapa_previsoes_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
