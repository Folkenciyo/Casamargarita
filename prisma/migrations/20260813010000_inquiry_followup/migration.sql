-- AlterTable
-- Seguimiento de consultas: contestada y nota privada. Ambas opcionales, así
-- que las consultas que ya existen se quedan como estaban.
ALTER TABLE "Inquiry" ADD COLUMN     "answeredAt" TIMESTAMP(3),
ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Inquiry_answeredAt_idx" ON "Inquiry"("answeredAt");
