-- CreateEnum
CREATE TYPE "EtapaStatus" AS ENUM ('NAO_INICIADO', 'EM_PROCESSO', 'FINALIZADO');

-- AlterTable
ALTER TABLE "contrato_etapa_concluida" ADD COLUMN     "status" "EtapaStatus" NOT NULL DEFAULT 'NAO_INICIADO';
ALTER TABLE "contrato_etapa_concluida" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Linhas existentes representavam "concluido" no modelo booleano antigo
-- (por presenca de linha) - migradas para FINALIZADO para preservar o estado.
UPDATE "contrato_etapa_concluida" SET "status" = 'FINALIZADO';
