-- AlterTable
ALTER TABLE "contratos_exportacao" ADD COLUMN     "contratoFinalizado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contratos_exportacao" ADD COLUMN     "dataFinalizacao" DATE;

-- CreateIndex
CREATE INDEX "contratos_exportacao_contratoFinalizado_idx" ON "contratos_exportacao"("contratoFinalizado");

-- A etapa "Liberacao da carga" (ultima do fluxo antigo) deixou de existir na
-- Mesa de Operacao e foi substituida pelo campo "Contrato Finalizado",
-- preenchido na etapa "Envio do BL". Contratos que ja estavam nessa etapa
-- sao migrados para finalizados, voltando para a ultima etapa que ainda
-- existe (Envio do BL) para continuarem visiveis na Mesa de Operacao caso
-- precisem ser reabertos.
UPDATE "contratos_exportacao"
SET "contratoFinalizado" = true,
    "dataFinalizacao" = COALESCE("dataChegada", "updatedAt"::date),
    "status" = 'ENVIO_BL_ORIGINAL_TELEX'
WHERE "status" = 'LIBERACAO_CARGA';
