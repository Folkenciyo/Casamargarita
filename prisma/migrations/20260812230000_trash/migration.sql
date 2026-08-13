-- AlterTable
-- Papelera. Null = la obra está viva, que es el estado de todo lo que ya
-- existe: la migración no cambia nada de lo que hay.
ALTER TABLE "Painting" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Painting_deletedAt_idx" ON "Painting"("deletedAt");
