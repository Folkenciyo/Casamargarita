-- AlterTable
-- Por defecto true: al desplegar, la galería sigue enseñando lo vendido
-- exactamente como hasta ahora. Ocultarlo es una decisión, no un efecto
-- secundario de actualizar.
ALTER TABLE "Artist" ADD COLUMN     "showSoldPaintings" BOOLEAN NOT NULL DEFAULT true;
