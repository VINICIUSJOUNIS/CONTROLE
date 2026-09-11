-- CreateTable
CREATE TABLE "transportadoras_rodoviarias" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transportadoras_rodoviarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transportadoras_rodoviarias_name_key" ON "transportadoras_rodoviarias"("name");

-- CreateTable
CREATE TABLE "itens_tabela_transportadora" (
    "id" TEXT NOT NULL,
    "transportadoraId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "precoPorContainer" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_tabela_transportadora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "itens_tabela_transportadora_transportadoraId_idx" ON "itens_tabela_transportadora"("transportadoraId");

-- CreateTable
CREATE TABLE "contrato_transporte_rodoviario" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "transportadoraId" TEXT,
    "itensSelecionadosIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quantidadeContainers" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrato_transporte_rodoviario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contrato_transporte_rodoviario_contratoId_key" ON "contrato_transporte_rodoviario"("contratoId");

-- CreateIndex
CREATE INDEX "contrato_transporte_rodoviario_transportadoraId_idx" ON "contrato_transporte_rodoviario"("transportadoraId");

-- AddForeignKey
ALTER TABLE "itens_tabela_transportadora" ADD CONSTRAINT "itens_tabela_transportadora_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "transportadoras_rodoviarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_transporte_rodoviario" ADD CONSTRAINT "contrato_transporte_rodoviario_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos_exportacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_transporte_rodoviario" ADD CONSTRAINT "contrato_transporte_rodoviario_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "transportadoras_rodoviarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
