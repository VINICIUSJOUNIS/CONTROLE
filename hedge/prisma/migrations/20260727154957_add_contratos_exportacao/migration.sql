-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('CONTRATO_ASSINADO', 'PRE_EMBARQUE', 'ESTUFAGEM_PORTO', 'EMBARCADO', 'CARGA_DESTINO', 'CONTRATO_FINALIZADO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_exportacao" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "valorUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dataEstufagem" DATE,
    "dataEmbarque" DATE,
    "dataChegada" DATE,
    "status" "StatusContrato" NOT NULL DEFAULT 'CONTRATO_ASSINADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_exportacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_name_key" ON "clientes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_exportacao_contractNumber_key" ON "contratos_exportacao"("contractNumber");

-- CreateIndex
CREATE INDEX "contratos_exportacao_clienteId_idx" ON "contratos_exportacao"("clienteId");

-- CreateIndex
CREATE INDEX "contratos_exportacao_status_idx" ON "contratos_exportacao"("status");

-- AddForeignKey
ALTER TABLE "contratos_exportacao" ADD CONSTRAINT "contratos_exportacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
