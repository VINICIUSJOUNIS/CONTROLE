-- AlterTable
ALTER TABLE "contrato_confirmacao_negocio"
  ADD COLUMN "fixacaoTipo" TEXT,
  ADD COLUMN "dataFixacao" DATE,
  ADD COLUMN "nivelBolsa" DECIMAL(10,4),
  ADD COLUMN "valorDolar" DECIMAL(10,4);
