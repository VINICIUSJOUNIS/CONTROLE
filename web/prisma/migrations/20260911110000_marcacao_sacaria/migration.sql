-- CreateEnum
CREATE TYPE "FaixaCoresMarcacao" AS ENUM ('UMA_COR', 'DUAS_CORES', 'TRES_CORES', 'QUATRO_CORES', 'CINCO_CORES', 'MAIS_DE_CINCO_CORES');

-- CreateTable
CREATE TABLE "fornecedores_marcacao_sacaria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fornecedores_marcacao_sacaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_marcacao_sacaria_name_key" ON "fornecedores_marcacao_sacaria"("name");

-- CreateTable
CREATE TABLE "tabela_preco_marcacao_sacaria" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "faixaCores" "FaixaCoresMarcacao" NOT NULL,
    "precoPorSaca" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tabela_preco_marcacao_sacaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tabela_preco_marcacao_sacaria_fornecedorId_faixaCores_key" ON "tabela_preco_marcacao_sacaria"("fornecedorId", "faixaCores");

-- CreateTable
CREATE TABLE "contrato_marcacao_sacaria" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "fornecedorId" TEXT,
    "faixaCores" "FaixaCoresMarcacao",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_marcacao_sacaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrato_marcacao_sacaria_contratoId_key" ON "contrato_marcacao_sacaria"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_marcacao_sacaria_fornecedorId_idx" ON "contrato_marcacao_sacaria"("fornecedorId");

-- AddForeignKey
ALTER TABLE "tabela_preco_marcacao_sacaria" ADD CONSTRAINT "tabela_preco_marcacao_sacaria_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores_marcacao_sacaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_marcacao_sacaria" ADD CONSTRAINT "contrato_marcacao_sacaria_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_marcacao_sacaria" ADD CONSTRAINT "contrato_marcacao_sacaria_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores_marcacao_sacaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
