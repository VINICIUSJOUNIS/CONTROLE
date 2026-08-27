-- CreateTable
CREATE TABLE "bank_transfer_channels" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'USD',
    "correspondentSwift" TEXT,
    "correspondentBanco" TEXT,
    "correspondentConta" TEXT,
    "beneficiarySwift" TEXT,
    "beneficiaryBanco" TEXT,
    "beneficiaryEndereco" TEXT,
    "finalBeneficiario" TEXT,
    "finalIban" TEXT,
    "finalLocal" TEXT,
    "finalBranch" TEXT,
    "finalConta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transfer_channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfer_channels_bankId_key" ON "bank_transfer_channels"("bankId");

-- AddForeignKey
ALTER TABLE "bank_transfer_channels" ADD CONSTRAINT "bank_transfer_channels_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

