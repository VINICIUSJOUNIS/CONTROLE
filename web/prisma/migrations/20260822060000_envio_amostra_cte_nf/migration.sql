-- AlterTable
ALTER TABLE "contrato_envio_amostra"
  ADD COLUMN "cteNumero" TEXT,
  ADD COLUMN "cteValor" DECIMAL(18,2),
  ADD COLUMN "notaFiscalNumero" TEXT,
  ADD COLUMN "notaFiscalValor" DECIMAL(18,2);
