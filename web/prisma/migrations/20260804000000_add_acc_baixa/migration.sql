-- CreateTable
CREATE TABLE "acc_baixas" (
    "id" TEXT NOT NULL,
    "accOperationId" TEXT NOT NULL,
    "valorUSD" DECIMAL(18,2) NOT NULL,
    "dataQuitacao" DATE NOT NULL,
    "closingRate" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acc_baixas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acc_baixas_accOperationId_idx" ON "acc_baixas"("accOperationId");

-- AddForeignKey
ALTER TABLE "acc_baixas" ADD CONSTRAINT "acc_baixas_accOperationId_fkey" FOREIGN KEY ("accOperationId") REFERENCES "acc_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
