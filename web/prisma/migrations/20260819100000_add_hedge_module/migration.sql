-- Adiciona o modulo Hedge (contratos de exportacao, operacoes de hedge cambial,
-- clientes, corretoras) ao banco do Controle. Consolida as 5 migrations originais
-- do app hedge/ em uma so, com guardas idempotentes (DO block para enums e
-- constraints, IF NOT EXISTS para tabelas e indices) porque as tabelas podem ja
-- existir neste banco (se web e hedge sempre compartilharam o mesmo Postgres).

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Side" AS ENUM ('COMPRA', 'VENDA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ContractType" AS ENUM ('NDF', 'TRAVA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "HedgeStatus" AS ENUM ('A_LIQUIDAR', 'LIQUIDADA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "StatusContrato" AS ENUM ('CONTRATO_ASSINADO', 'PRE_EMBARQUE', 'ESTUFAGEM_PORTO', 'EMBARCADO', 'CARGA_DESTINO', 'CONTRATO_FINALIZADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "corretoras" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corretoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hedge_operations" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "clientes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable (ja com todas as colunas das migrations 2-5 do hedge consolidadas)
CREATE TABLE IF NOT EXISTS "contratos_exportacao" (
    "id" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "corretoraId" TEXT,
    "country" TEXT NOT NULL DEFAULT '',
    "valorUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dataEstufagem" DATE,
    "dataEmbarque" DATE,
    "dataChegada" DATE,
    "status" "StatusContrato" NOT NULL DEFAULT 'CONTRATO_ASSINADO',

    "quantSacas" INTEGER,
    "adiantamentoUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dataAdiantamento" DATE,
    "financiadoPelaRts" BOOLEAN NOT NULL DEFAULT false,
    "valorFinanciadoRtsUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dataLiberacaoFinanciamentoRts" DATE,
    "previsaoPagamentoCliente" DATE,
    "saldoAReceberRtsUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorRecebidoRtsUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "dataRecebimentoRts" DATE,
    "obsRecebimento" TEXT,

    "despachante" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "certificados" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "freteTerrestre" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "freteMaritimo" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxasLocaisArmador" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fumigacao" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "embalagens" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "inspecao" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "despesasPortuarias" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "armazem" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "envioAmostra" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "marcacaoSacaria" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "envioDocumentacao" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "telexRelease" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "legalizacao" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "financiamentoRts" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "diariaContainerDetention" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "despesasRedex" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "estadiaContainer" DECIMAL(18,2) NOT NULL DEFAULT 0,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_exportacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "corretoras_name_key" ON "corretoras"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hedge_operations_corretoraId_idx" ON "hedge_operations"("corretoraId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hedge_operations_status_idx" ON "hedge_operations"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "clientes_name_key" ON "clientes"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "contratos_exportacao_contractNumber_key" ON "contratos_exportacao"("contractNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contratos_exportacao_clienteId_idx" ON "contratos_exportacao"("clienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contratos_exportacao_status_idx" ON "contratos_exportacao"("status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "hedge_operations" ADD CONSTRAINT "hedge_operations_corretoraId_fkey" FOREIGN KEY ("corretoraId") REFERENCES "corretoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "contratos_exportacao" ADD CONSTRAINT "contratos_exportacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "contratos_exportacao" ADD CONSTRAINT "contratos_exportacao_corretoraId_fkey" FOREIGN KEY ("corretoraId") REFERENCES "corretoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
