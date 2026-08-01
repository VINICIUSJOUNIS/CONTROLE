/*
  Warnings:

  - You are about to drop the column `ativoNaoCirculante` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `contasReceber` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `despesasOperacionais` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `impostos` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `outrosAtivosCirculantes` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `outrosPassivosCirculantes` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `outrosPassivosNaoCirculantes` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `patrimonioLiquido` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `resultadoFinanceiro` on the `financial_statements` table. All the data in the column will be lost.
  - You are about to drop the column `resultadoOperacional` on the `financial_statements` table. All the data in the column will be lost.
  - Added the required column `contasReceberClientes` to the `financial_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `impostoRenda` to the `financial_statements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resultadoAtividade` to the `financial_statements` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_financial_statements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodLabel" TEXT NOT NULL,
    "referenceDate" DATETIME NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "receitaBruta" REAL NOT NULL,
    "deducoes" REAL NOT NULL,
    "receitaLiquida" REAL NOT NULL,
    "cmv" REAL NOT NULL,
    "lucroBruto" REAL NOT NULL,
    "outrasReceitasOperacionais" REAL NOT NULL DEFAULT 0,
    "despesasGerais" REAL NOT NULL DEFAULT 0,
    "despesasComerciais" REAL NOT NULL DEFAULT 0,
    "despesasTributarias" REAL NOT NULL DEFAULT 0,
    "depreciacaoAmortizacao" REAL NOT NULL,
    "outrasDespesasOperacionais" REAL NOT NULL DEFAULT 0,
    "resultadoAtividade" REAL NOT NULL,
    "receitasFinanceiras" REAL NOT NULL DEFAULT 0,
    "despesasFinanceiras" REAL NOT NULL DEFAULT 0,
    "variacaoCambial" REAL NOT NULL DEFAULT 0,
    "resultadoNaoOperacional" REAL NOT NULL DEFAULT 0,
    "impostoRenda" REAL NOT NULL,
    "participacoes" REAL NOT NULL DEFAULT 0,
    "lucroLiquido" REAL NOT NULL,
    "caixaEquivalentes" REAL NOT NULL,
    "titulosValoresMobiliarios" REAL NOT NULL DEFAULT 0,
    "contasReceberClientes" REAL NOT NULL,
    "estoques" REAL NOT NULL,
    "adiantamentoFornecedores" REAL NOT NULL DEFAULT 0,
    "outrosAtivosOperacionaisCirc" REAL NOT NULL DEFAULT 0,
    "outrosAtivosNaoOperacionaisCirc" REAL NOT NULL DEFAULT 0,
    "contasReceberColigadas" REAL NOT NULL DEFAULT 0,
    "investimentos" REAL NOT NULL DEFAULT 0,
    "imobilizado" REAL NOT NULL DEFAULT 0,
    "intangivel" REAL NOT NULL DEFAULT 0,
    "outrosAtivosNaoCirculantes" REAL NOT NULL DEFAULT 0,
    "fornecedores" REAL NOT NULL,
    "salariosEncargos" REAL NOT NULL DEFAULT 0,
    "impostosContribuicoes" REAL NOT NULL DEFAULT 0,
    "emprestimosCurtoPrazo" REAL NOT NULL,
    "irAPagar" REAL NOT NULL DEFAULT 0,
    "emprestimosColigadasCP" REAL NOT NULL DEFAULT 0,
    "dividendosAPagar" REAL NOT NULL DEFAULT 0,
    "adiantamentosClientes" REAL NOT NULL DEFAULT 0,
    "outrosPassivosCirc" REAL NOT NULL DEFAULT 0,
    "emprestimosLongoPrazo" REAL NOT NULL,
    "outrosPassivosNaoCirc" REAL NOT NULL DEFAULT 0,
    "capitalSocial" REAL NOT NULL DEFAULT 0,
    "reservas" REAL NOT NULL DEFAULT 0,
    "lucrosPrejuizosAcumulados" REAL NOT NULL DEFAULT 0,
    "outrosResultadosAbrangentes" REAL NOT NULL DEFAULT 0,
    "ativosMoedaEstrangeira" REAL,
    "passivosMoedaEstrangeira" REAL,
    "extractedRaw" JSONB NOT NULL,
    "aiInsights" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_financial_statements" ("aiInsights", "ativosMoedaEstrangeira", "caixaEquivalentes", "cmv", "createdAt", "deducoes", "depreciacaoAmortizacao", "emprestimosCurtoPrazo", "emprestimosLongoPrazo", "estoques", "extractedRaw", "fornecedores", "id", "lucroBruto", "lucroLiquido", "passivosMoedaEstrangeira", "periodDays", "periodLabel", "receitaBruta", "receitaLiquida", "referenceDate", "sourceFileName", "updatedAt") SELECT "aiInsights", "ativosMoedaEstrangeira", "caixaEquivalentes", "cmv", "createdAt", "deducoes", "depreciacaoAmortizacao", "emprestimosCurtoPrazo", "emprestimosLongoPrazo", "estoques", "extractedRaw", "fornecedores", "id", "lucroBruto", "lucroLiquido", "passivosMoedaEstrangeira", "periodDays", "periodLabel", "receitaBruta", "receitaLiquida", "referenceDate", "sourceFileName", "updatedAt" FROM "financial_statements";
DROP TABLE "financial_statements";
ALTER TABLE "new_financial_statements" RENAME TO "financial_statements";
CREATE UNIQUE INDEX "financial_statements_referenceDate_key" ON "financial_statements"("referenceDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
