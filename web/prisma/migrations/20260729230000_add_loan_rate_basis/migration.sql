-- CreateEnum
CREATE TYPE "RateBasis" AS ENUM ('MENSAL', 'SEMESTRAL', 'ANUAL');

-- AlterTable
ALTER TABLE "loans" ADD COLUMN "rateBasis" "RateBasis" NOT NULL DEFAULT 'ANUAL';
