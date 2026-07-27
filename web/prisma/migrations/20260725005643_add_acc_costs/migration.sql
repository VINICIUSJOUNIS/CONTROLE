-- AlterTable
ALTER TABLE "acc_operations" ADD COLUMN     "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insuranceCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherCosts" DECIMAL(18,2) NOT NULL DEFAULT 0;
