-- AlterTable
ALTER TABLE "acc_operations" ADD COLUMN     "exchangeVariationValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
ALTER COLUMN "closingDate" DROP NOT NULL;
