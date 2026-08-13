-- CreateTable
-- Contador por obra y día. Sin identificadores de visitante: la clave es
-- (obra, día) y lo único que se guarda es cuántas veces se abrió la ficha.
CREATE TABLE "PaintingView" (
    "paintingId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaintingView_pkey" PRIMARY KEY ("paintingId","day")
);

-- CreateIndex
CREATE INDEX "PaintingView_day_idx" ON "PaintingView"("day");

-- AddForeignKey
-- Cascade: si la obra se borra de verdad, sus visitas no significan nada.
ALTER TABLE "PaintingView" ADD CONSTRAINT "PaintingView_paintingId_fkey"
  FOREIGN KEY ("paintingId") REFERENCES "Painting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
