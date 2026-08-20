-- AlterTable
ALTER TABLE "contas_garantidas"
  DROP COLUMN IF EXISTS "iofPercent",
  DROP COLUMN IF EXISTS "iofAdicionalPercent",
  ADD COLUMN IF NOT EXISTS "dataUtilizacao" DATE;
