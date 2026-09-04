/**
 * Agrupa las obras de la sala 3D en secciones por serie. Puro y sin Prisma:
 * lib/public/queries.ts hace la consulta y le pasa las filas ya ordenadas.
 */

export const SIN_SERIE_SLUG = "sin-serie";
const SIN_SERIE_TITLE = "Sin serie";

export type PaintingConSerie = {
  series: { id: string; slug: string; title: string; published: boolean } | null;
};

export type RoomSection<T> = {
  id: string;
  slug: string;
  title: string;
  paintings: T[];
};

/**
 * Una sección por cada serie publicada que tenga obra visible, en su orden,
 * más una sección final "Sin serie" para lo que no encaje en ninguna —obra
 * suelta, o cuya serie esté oculta: una serie oculta no debe dar sala propia,
 * igual que no asoma en la ficha de sus obras.
 */
export function agruparPorSeccion<T extends PaintingConSerie>(
  paintings: T[],
  seriesOrdenadas: { id: string; slug: string; title: string }[],
): RoomSection<T>[] {
  const porSerie = new Map<string, T[]>();
  const sueltas: T[] = [];

  for (const painting of paintings) {
    if (painting.series?.published) {
      const grupo = porSerie.get(painting.series.id) ?? [];
      grupo.push(painting);
      porSerie.set(painting.series.id, grupo);
    } else {
      sueltas.push(painting);
    }
  }

  const secciones: RoomSection<T>[] = [];
  for (const serie of seriesOrdenadas) {
    const grupo = porSerie.get(serie.id);
    if (grupo && grupo.length > 0) {
      secciones.push({ id: serie.id, slug: serie.slug, title: serie.title, paintings: grupo });
    }
  }
  if (sueltas.length > 0) {
    secciones.push({ id: SIN_SERIE_SLUG, slug: SIN_SERIE_SLUG, title: SIN_SERIE_TITLE, paintings: sueltas });
  }

  return secciones;
}
