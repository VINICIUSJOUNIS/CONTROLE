-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INTERNO', 'EXTERNO');

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientType" "ClientType" NOT NULL,
    "quantityKg" DECIMAL(18,2) NOT NULL,
    "country" TEXT,
    "containerCount" INTEGER,
    "saleDate" DATE NOT NULL,
    "valueBRL" DECIMAL(18,2) NOT NULL,
    "valueUSD" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_clientType_idx" ON "sales"("clientType");

-- CreateIndex
CREATE INDEX "sales_saleDate_idx" ON "sales"("saleDate");
