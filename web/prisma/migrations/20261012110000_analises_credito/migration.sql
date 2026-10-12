-- Analise de Credito refeita: um registro por mes com Balanco e DRE extraidos do PDF.
CREATE TABLE "analises_credito" (
    "id" TEXT NOT NULL,
    "competencia" DATE NOT NULL,
    "empresa" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "dataBalanco" DATE NOT NULL,
    "dataBalancoAnterior" DATE,
    "dreTipo" TEXT NOT NULL,
    "dreInicio" DATE,
    "dreFim" DATE NOT NULL,
    "balanco" JSONB NOT NULL,
    "balancoAnterior" JSONB,
    "dre" JSONB NOT NULL,
    "origens" JSONB NOT NULL,
    "conferenciaPdf" JSONB NOT NULL,
    "observacoes" JSONB NOT NULL,
    "arquivos" TEXT[],
    "modeloIa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analises_credito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analises_credito_competencia_key" ON "analises_credito"("competencia");
