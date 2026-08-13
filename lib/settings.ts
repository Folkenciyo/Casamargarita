import { CACHE_TAGS, cacheado } from "@/lib/cache";
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

/**
 * Los ajustes, cacheados. Es la consulta que más se repite del sitio —la pide
 * casi todas las vistas públicas— y cambia dos veces al año. Es la que deben
 * usar las vistas; `getSiteSettings` queda para quien no tenga caché detrás.
 */
export const ajustesPublicos = cacheado(
  "ajustes-sitio",
  [CACHE_TAGS.artist],
  () => getSiteSettings(),
);

/** El `where` de Prisma que comparten galería, portada, sala, ficha y sitemap. */
export async function publicPaintingWhere(): Promise<PaintingVisibilityFilter> {
  const { showSoldPaintings } = await ajustesPublicos();
  return visiblePaintingFilter(showSoldPaintings);
}
