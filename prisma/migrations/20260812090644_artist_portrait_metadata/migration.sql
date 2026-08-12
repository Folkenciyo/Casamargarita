-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "portraitBlurDataUrl" TEXT,
ADD COLUMN     "portraitHeight" INTEGER,
ADD COLUMN     "portraitWidth" INTEGER,
ADD COLUMN     "portraitWidths" INTEGER[];
