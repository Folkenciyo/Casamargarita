import {
  visiblePaintingFilter,
  type PaintingVisibilityFilter,
} from "@/lib/catalog";
import { prisma } from "@/lib/db";

export type SiteSettings = {
  showSoldPaintings: boolean;
};

/**
 * Ajustes del sitio. Viven en la fila singleton de Artist: son cuatro
 * interruptores de la artista, no justifican una tabla aparte.
 *
 * Si la fila todavía no existe (instalación recién sembrada) se responde con
 * los valores por defecto en lugar de fallar: el público nunca debe ver un
 * error porque falte un ajuste.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const artist = await prisma.artist.findUnique({
    where: { id: "singleton" },
    select: { showSoldPaintings: true },
  });

  return { showSoldPaintings: artist?.showSoldPaintings ?? true };
}

/** El `where` de Prisma que comparten galería, portada, sala, ficha y sitemap. */
export async function publicPaintingWhere(): Promise<PaintingVisibilityFilter> {
  const { showSoldPaintings } = await getSiteSettings();
  return visiblePaintingFilter(showSoldPaintings);
}
