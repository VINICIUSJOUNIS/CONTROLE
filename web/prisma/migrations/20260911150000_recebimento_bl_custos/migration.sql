-- AlterTable
ALTER TABLE "contratos_exportacao" ADD COLUMN     "correcaoBL" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "armadores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "armadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_tabela_armador" (
    "id" TEXT NOT NULL,
    "armadorId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "precoPorContainer" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_tabela_armador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_taxas_locais_armador" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "armadorId" TEXT,
    "itensSelecionadosIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quantidadeContainers" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_taxas_locais_armador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas_frete_maritimo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_frete_maritimo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_tabela_frete_maritimo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "precoPorContainer" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_tabela_frete_maritimo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato_frete_maritimo" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "empresaId" TEXT,
    "itensSelecionadosIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quantidadeContainers" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_frete_maritimo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "armadores_name_key" ON "armadores"("name");

-- CreateIndex
CREATE INDEX "itens_tabela_armador_armadorId_idx" ON "itens_tabela_armador"("armadorId");

-- CreateIndex
CREATE UNIQUE INDEX "contrato_taxas_locais_armador_contratoId_key" ON "contrato_taxas_locais_armador"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_taxas_locais_armador_armadorId_idx" ON "contrato_taxas_locais_armador"("armadorId");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_frete_maritimo_name_key" ON "empresas_frete_maritimo"("name");

-- CreateIndex
CREATE INDEX "itens_tabela_frete_maritimo_empresaId_idx" ON "itens_tabela_frete_maritimo"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "contrato_frete_maritimo_contratoId_key" ON "contrato_frete_maritimo"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_frete_maritimo_empresaId_idx" ON "contrato_frete_maritimo"("empresaId");

-- AddForeignKey
ALTER TABLE "itens_tabela_armador" ADD CONSTRAINT "itens_tabela_armador_armadorId_fkey" FOREIGN KEY ("armadorId") REFERENCES "armadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_taxas_locais_armador" ADD CONSTRAINT "contrato_taxas_locais_armador_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_taxas_locais_armador" ADD CONSTRAINT "contrato_taxas_locais_armador_armadorId_fkey" FOREIGN KEY ("armadorId") REFERENCES "armadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_tabela_frete_maritimo" ADD CONSTRAINT "itens_tabela_frete_maritimo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_frete_maritimo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_frete_maritimo" ADD CONSTRAINT "contrato_frete_maritimo_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_frete_maritimo" ADD CONSTRAINT "contrato_frete_maritimo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_frete_maritimo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
