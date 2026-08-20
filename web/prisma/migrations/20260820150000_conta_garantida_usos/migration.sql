-- CreateTable
CREATE TABLE "contas_garantidas_usos" (
    "id" TEXT NOT NULL,
    "contaGarantidaId" TEXT NOT NULL,
    "valorUtilizado" DECIMAL(18,2) NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_garantidas_usos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_garantidas_usos_contaGarantidaId_idx" ON "contas_garantidas_usos"("contaGarantidaId");

-- AddForeignKey
ALTER TABLE "contas_garantidas_usos" ADD CONSTRAINT "contas_garantidas_usos_contaGarantidaId_fkey" FOREIGN KEY ("contaGarantidaId") REFERENCES "contas_garantidas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing usage (valorUtilizado + dataUtilizacao) into a single open
-- usage record per conta garantida, so history is preserved before the old
-- columns are dropped. Rows with no value in use are skipped.
INSERT INTO "contas_garantidas_usos" ("id", "contaGarantidaId", "valorUtilizado", "dataInicio", "dataFim", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "valorUtilizado", COALESCE("dataUtilizacao", "createdAt"::date), NULL, "createdAt", "updatedAt"
FROM "contas_garantidas"
WHERE "valorUtilizado" <> 0;

-- AlterTable
ALTER TABLE "contas_garantidas"
  DROP COLUMN "valorUtilizado",
  DROP COLUMN "dataUtilizacao";
