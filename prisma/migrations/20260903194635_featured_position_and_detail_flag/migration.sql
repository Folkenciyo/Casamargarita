-- DropIndex
DROP INDEX "Painting_featured_idx";

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "isDetail" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Painting" ADD COLUMN     "featuredPosition" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Painting_featured_featuredPosition_idx" ON "Painting"("featured", "featuredPosition");
