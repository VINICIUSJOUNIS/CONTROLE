-- CreateTable
CREATE TABLE "tipos_amostra" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_amostra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_amostra_name_key" ON "tipos_amostra"("name");

-- CreateTable
CREATE TABLE "transportadoras_amostra" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transportadoras_amostra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transportadoras_amostra_name_key" ON "transportadoras_amostra"("name");

-- CreateTable
CREATE TABLE "contrato_envio_amostra" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipoAmostraId" TEXT,
    "transportadoraId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_envio_amostra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrato_envio_amostra_contratoId_key" ON "contrato_envio_amostra"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_envio_amostra_tipoAmostraId_idx" ON "contrato_envio_amostra"("tipoAmostraId");

-- CreateIndex
CREATE INDEX "contrato_envio_amostra_transportadoraId_idx" ON "contrato_envio_amostra"("transportadoraId");

-- AddForeignKey
ALTER TABLE "contrato_envio_amostra" ADD CONSTRAINT "contrato_envio_amostra_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_envio_amostra" ADD CONSTRAINT "contrato_envio_amostra_tipoAmostraId_fkey" FOREIGN KEY ("tipoAmostraId") REFERENCES "tipos_amostra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_envio_amostra" ADD CONSTRAINT "contrato_envio_amostra_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "transportadoras_amostra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Transportadoras padrao ja cadastradas (usuario pode adicionar outras).
INSERT INTO "transportadoras_amostra" ("id", "name") VALUES
  (gen_random_uuid()::text, 'DHL'),
  (gen_random_uuid()::text, 'FedEx');
