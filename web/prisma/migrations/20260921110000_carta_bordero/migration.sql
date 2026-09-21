-- AlterTable
ALTER TABLE "contratos_exportacao" ADD COLUMN     "bancoCartaBordero" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "awbBancoCliente" DECIMAL(18,2) NOT NULL DEFAULT 0;
