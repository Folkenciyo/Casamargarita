-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");

-- CreateIndex
CREATE INDEX "Series_published_position_idx" ON "Series"("published", "position");

-- AlterTable
-- Opcional y nullable: la obra que ya existe no pertenece a ninguna serie y
-- sigue funcionando exactamente igual.
ALTER TABLE "Painting" ADD COLUMN     "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "Painting_seriesId_position_idx" ON "Painting"("seriesId", "position");

-- AddForeignKey
-- SetNull y no Cascade: borrar una serie deshace la agrupación, nunca la obra.
ALTER TABLE "Painting" ADD CONSTRAINT "Painting_seriesId_fkey"
  FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
