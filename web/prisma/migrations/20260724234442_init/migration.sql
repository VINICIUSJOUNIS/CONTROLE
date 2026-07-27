-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRADOR', 'TESOURARIA', 'FINANCEIRO', 'CONSULTA');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ATIVO', 'LIQUIDADO', 'EM_ATRASO');

-- CreateEnum
CREATE TYPE "AccStatus" AS ENUM ('EM_ABERTO', 'LIQUIDADO', 'EM_ATRASO');

-- CreateEnum
CREATE TYPE "Indexer" AS ENUM ('CDI', 'SOFR', 'PRE_FIXADO', 'SELIC');

-- CreateEnum
CREATE TYPE "AmortizationSystem" AS ENUM ('PRICE', 'SAC', 'BULLET');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR');

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
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "contractedValue" DECIMAL(18,2) NOT NULL,
    "netValue" DECIMAL(18,2) NOT NULL,
    "interestRate" DECIMAL(6,2) NOT NULL,
    "indexer" "Indexer" NOT NULL,
    "spread" DECIMAL(6,2) NOT NULL,
    "amortizationSystem" "AmortizationSystem" NOT NULL,
    "contractDate" DATE NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "lastDueDate" DATE NOT NULL,
    "installments" INTEGER NOT NULL,
    "periodicity" TEXT NOT NULL,
    "guarantee" TEXT NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acc_operations" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "accNumber" TEXT NOT NULL,
    "exchangeContractNumber" TEXT NOT NULL,
    "exporter" TEXT NOT NULL,
    "foreignClient" TEXT NOT NULL,
    "invoice" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "invoiceValue" DECIMAL(18,2) NOT NULL,
    "contractedValueForeign" DECIMAL(18,2) NOT NULL,
    "receivedValueBRL" DECIMAL(18,2) NOT NULL,
    "spotRate" DECIMAL(10,4) NOT NULL,
    "closingRate" DECIMAL(10,4) NOT NULL,
    "ptaxContracting" DECIMAL(10,4) NOT NULL,
    "ptaxSettlement" DECIMAL(10,4) NOT NULL,
    "contractDate" DATE NOT NULL,
    "closingDate" DATE NOT NULL,
    "settlementDate" DATE NOT NULL,
    "interestRate" DECIMAL(6,2) NOT NULL,
    "iof" DECIMAL(18,2) NOT NULL,
    "exchangeSpread" DECIMAL(10,4) NOT NULL,
    "bankFees" DECIMAL(18,2) NOT NULL,
    "status" "AccStatus" NOT NULL DEFAULT 'EM_ABERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acc_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "banks_name_key" ON "banks"("name");

-- CreateIndex
CREATE UNIQUE INDEX "loans_contractNumber_key" ON "loans"("contractNumber");

-- CreateIndex
CREATE INDEX "loans_bankId_idx" ON "loans"("bankId");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "acc_operations_accNumber_key" ON "acc_operations"("accNumber");

-- CreateIndex
CREATE INDEX "acc_operations_bankId_idx" ON "acc_operations"("bankId");

-- CreateIndex
CREATE INDEX "acc_operations_status_idx" ON "acc_operations"("status");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acc_operations" ADD CONSTRAINT "acc_operations_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
