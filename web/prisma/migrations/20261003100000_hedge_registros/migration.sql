-- CreateTable
CREATE TABLE "hedge_registros" (
    "id" TEXT NOT NULL,
    "aba" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "dados" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hedge_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hedge_parametros" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hedge_parametros_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "hedge_registros_aba_ordem_idx" ON "hedge_registros"("aba", "ordem");
