-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paintingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalImage" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "basePath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "widths" INTEGER[],
    "blurDataUrl" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_slug_key" ON "JournalEntry"("slug");

-- CreateIndex
CREATE INDEX "JournalEntry_published_publishedAt_idx" ON "JournalEntry"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "JournalImage_entryId_position_idx" ON "JournalImage"("entryId", "position");

-- AddForeignKey
-- SetNull: borrar una obra no puede llevarse el texto que se escribió sobre
-- ella; la entrada se queda, solo pierde el enlace.
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_paintingId_fkey"
  FOREIGN KEY ("paintingId") REFERENCES "Painting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- Cascade: las fotos de una entrada no significan nada sin la entrada.
ALTER TABLE "JournalImage" ADD CONSTRAINT "JournalImage_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
