-- CreateTable
CREATE TABLE "sale_returns" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "quantityKg" DECIMAL(18,2) NOT NULL,
    "returnDate" DATE NOT NULL,
    "valueBRL" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sale_returns_returnDate_idx" ON "sale_returns"("returnDate");
