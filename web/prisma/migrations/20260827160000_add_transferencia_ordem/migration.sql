-- CreateTable
CREATE TABLE "transferencias_ordem" (
    "id" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "tipo" TEXT NOT NULL,
    "numeroOrdem" TEXT NOT NULL,
    "moeda" TEXT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "valorExtenso" TEXT NOT NULL,
    "bankId" TEXT,
    "bancoDestino" TEXT NOT NULL,
    "descontaTarifa" TEXT NOT NULL,
    "valorTarifa" DECIMAL(18,2),
    "instrucoes" TEXT NOT NULL,
    "observacoes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_ordem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transferencias_ordem" ADD CONSTRAINT "transferencias_ordem_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
