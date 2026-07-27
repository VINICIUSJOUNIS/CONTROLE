-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRADOR', 'TESOURARIA', 'FINANCEIRO', 'CONSULTA');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('COMPRA', 'VENDA');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('NDF', 'TRAVA');

-- CreateEnum
CREATE TYPE "HedgeStatus" AS ENUM ('A_LIQUIDAR', 'LIQUIDADA');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CONSULTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corretoras" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corretoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hedge_operations" (
    "id" TEXT NOT NULL,
    "corretoraId" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL DEFAULT 'NDF',
    "side" "Side",
    "contractDate" DATE NOT NULL,
    "vencimento" DATE NOT NULL,
    "valorUsd" DECIMAL(18,2) NOT NULL,
    "liquidacaoParcialUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldoUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "nivelCompra" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "nivelVenda" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "desagioValor" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalReais" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "HedgeStatus" NOT NULL DEFAULT 'A_LIQUIDAR',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hedge_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "corretoras_name_key" ON "corretoras"("name");

-- CreateIndex
CREATE INDEX "hedge_operations_corretoraId_idx" ON "hedge_operations"("corretoraId");

-- CreateIndex
CREATE INDEX "hedge_operations_status_idx" ON "hedge_operations"("status");

-- AddForeignKey
ALTER TABLE "hedge_operations" ADD CONSTRAINT "hedge_operations_corretoraId_fkey" FOREIGN KEY ("corretoraId") REFERENCES "corretoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
