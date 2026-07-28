-- AlterTable
ALTER TABLE "contratos_exportacao" ADD COLUMN     "corretoraId" TEXT;

-- AddForeignKey
ALTER TABLE "contratos_exportacao" ADD CONSTRAINT "contratos_exportacao_corretoraId_fkey" FOREIGN KEY ("corretoraId") REFERENCES "corretoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
