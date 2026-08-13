-- CreateEnum
CREATE TYPE "MilestoneKind" AS ENUM ('EXHIBITION', 'AWARD', 'COLLECTION', 'PRESS');

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "kind" "MilestoneKind" NOT NULL,
    "title" TEXT NOT NULL,
    "place" TEXT NOT NULL DEFAULT '',
    "year" INTEGER NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Milestone_published_year_idx" ON "Milestone"("published", "year");
