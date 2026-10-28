-- Analise de Credito: balanco e DRE do trimestre acumulado, enviados em PDF
-- proprio. Tabela separada dos meses para nao colidir com o mes que fecha o
-- trimestre (mar, jun, set, dez). trimestre = "AAAA-Tn".
CREATE TABLE "analises_credito_trimestre" (
    "id" TEXT NOT NULL,
    "trimestre" TEXT NOT NULL,
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
    "documentos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modeloIa" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analises_credito_trimestre_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analises_credito_trimestre_trimestre_key" ON "analises_credito_trimestre"("trimestre");
