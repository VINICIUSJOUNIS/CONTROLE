-- AlterTable
ALTER TABLE "bank_transfer_channels" ADD COLUMN     "instrucoes" TEXT NOT NULL DEFAULT '';

ALTER TABLE "bank_transfer_channels" ALTER COLUMN "instrucoes" DROP DEFAULT;

ALTER TABLE "bank_transfer_channels" DROP COLUMN "beneficiaryBanco",
DROP COLUMN "beneficiaryEndereco",
DROP COLUMN "beneficiarySwift",
DROP COLUMN "correspondentBanco",
DROP COLUMN "correspondentConta",
DROP COLUMN "correspondentSwift",
DROP COLUMN "finalBeneficiario",
DROP COLUMN "finalBranch",
DROP COLUMN "finalConta",
DROP COLUMN "finalIban",
DROP COLUMN "finalLocal";
