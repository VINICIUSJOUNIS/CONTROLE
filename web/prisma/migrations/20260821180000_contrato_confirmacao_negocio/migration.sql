-- CreateTable
CREATE TABLE "contrato_confirmacao_negocio" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "dataConfirmacao" DATE,
    "numeroContrato" TEXT,
    "corretoraId" TEXT,
    "clienteId" TEXT,
    "valorUsd" DECIMAL(18,2),
    "frete" DECIMAL(18,2),
    "tipoEmbalagem" TEXT,
    "quantidadeSacas" INTEGER,
    "descricaoCafe" TEXT,
    "previsaoEmbarque" DATE,
    "destinoCarga" TEXT,
    "formaPagamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_confirmacao_negocio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrato_confirmacao_negocio_contratoId_key" ON "contrato_confirmacao_negocio"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_corretoraId_idx" ON "contrato_confirmacao_negocio"("corretoraId");

-- CreateIndex
CREATE INDEX "contrato_confirmacao_negocio_clienteId_idx" ON "contrato_confirmacao_negocio"("clienteId");

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_corretoraId_fkey" FOREIGN KEY ("corretoraId") REFERENCES "corretoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_confirmacao_negocio" ADD CONSTRAINT "contrato_confirmacao_negocio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
