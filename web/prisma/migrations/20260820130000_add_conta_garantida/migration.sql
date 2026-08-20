-- CreateTable
CREATE TABLE "contas_garantidas" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "limiteContratado" DECIMAL(18,2) NOT NULL,
    "valorUtilizado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxaJurosPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "iofPercent" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "iofAdicionalPercent" DECIMAL(6,4) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_garantidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_garantidas_bankId_idx" ON "contas_garantidas"("bankId");

-- AddForeignKey
ALTER TABLE "contas_garantidas" ADD CONSTRAINT "contas_garantidas_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
