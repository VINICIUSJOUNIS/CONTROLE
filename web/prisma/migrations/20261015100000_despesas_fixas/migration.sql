-- Controle de Despesas Fixas: balancete mensal das despesas e ajustes de classificacao.
CREATE TABLE "balancetes_despesas" (
    "id" TEXT NOT NULL,
    "competencia" DATE NOT NULL,
    "empresa" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "contas" JSONB NOT NULL,
    "totalPdf" JSONB NOT NULL,
    "arquivos" TEXT[],
    "modeloIa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "balancetes_despesas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "balancetes_despesas_competencia_key" ON "balancetes_despesas"("competencia");

CREATE TABLE "classificacoes_despesa" (
    "classificacao" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "classificacoes_despesa_pkey" PRIMARY KEY ("classificacao")
);
