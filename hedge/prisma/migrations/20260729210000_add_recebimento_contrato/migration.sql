-- AlterTable
ALTER TABLE "contratos_exportacao"
  ADD COLUMN "quantSacas" INTEGER,
  ADD COLUMN "adiantamentoUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "dataAdiantamento" DATE,
  ADD COLUMN "financiadoPelaRts" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "valorFinanciadoRtsUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "dataLiberacaoFinanciamentoRts" DATE,
  ADD COLUMN "previsaoPagamentoCliente" DATE,
  ADD COLUMN "saldoAReceberRtsUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "valorRecebidoRtsUsd" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "dataRecebimentoRts" DATE,
  ADD COLUMN "obsRecebimento" TEXT;
