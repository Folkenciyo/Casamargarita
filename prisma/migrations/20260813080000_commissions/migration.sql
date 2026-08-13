-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "widthCm" INTEGER,
    "heightCm" INTEGER,
    "deadline" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Commission_answeredAt_createdAt_idx" ON "Commission"("answeredAt", "createdAt");
