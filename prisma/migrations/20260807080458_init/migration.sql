-- CreateEnum
CREATE TYPE "PaintingStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'NOT_FOR_SALE');

-- CreateTable
CREATE TABLE "Painting" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "technique" TEXT NOT NULL DEFAULT 'Óleo sobre lienzo',
    "widthCm" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaintingStatus" NOT NULL DEFAULT 'AVAILABLE',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Painting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "paintingId" TEXT NOT NULL,
    "basePath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "blurDataUrl" TEXT NOT NULL,
    "alt" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL,
    "statement" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "portraitPath" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "paintingId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Painting_slug_key" ON "Painting"("slug");

-- CreateIndex
CREATE INDEX "Painting_published_position_idx" ON "Painting"("published", "position");

-- CreateIndex
CREATE INDEX "Painting_featured_idx" ON "Painting"("featured");

-- CreateIndex
CREATE INDEX "Image_paintingId_position_idx" ON "Image"("paintingId", "position");

-- CreateIndex
CREATE INDEX "Inquiry_readAt_createdAt_idx" ON "Inquiry"("readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_paintingId_fkey" FOREIGN KEY ("paintingId") REFERENCES "Painting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_paintingId_fkey" FOREIGN KEY ("paintingId") REFERENCES "Painting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
