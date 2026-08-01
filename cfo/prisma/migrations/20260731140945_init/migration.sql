-- CreateTable
CREATE TABLE "financial_statements" (
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
    "despesasOperacionais" REAL NOT NULL,
    "depreciacaoAmortizacao" REAL NOT NULL,
    "resultadoOperacional" REAL NOT NULL,
    "resultadoFinanceiro" REAL NOT NULL,
    "impostos" REAL NOT NULL,
    "lucroLiquido" REAL NOT NULL,
    "caixaEquivalentes" REAL NOT NULL,
    "contasReceber" REAL NOT NULL,
    "estoques" REAL NOT NULL,
    "outrosAtivosCirculantes" REAL NOT NULL,
    "ativoNaoCirculante" REAL NOT NULL,
    "fornecedores" REAL NOT NULL,
    "emprestimosCurtoPrazo" REAL NOT NULL,
    "outrosPassivosCirculantes" REAL NOT NULL,
    "emprestimosLongoPrazo" REAL NOT NULL,
    "outrosPassivosNaoCirculantes" REAL NOT NULL,
    "patrimonioLiquido" REAL NOT NULL,
    "ativosMoedaEstrangeira" REAL,
    "passivosMoedaEstrangeira" REAL,
    "extractedRaw" JSONB NOT NULL,
    "aiInsights" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_statements_referenceDate_key" ON "financial_statements"("referenceDate");
