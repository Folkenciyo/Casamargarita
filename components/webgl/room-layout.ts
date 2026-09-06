export type RoomPainting = {
  slug: string;
  title: string;
  priceLabel: string;
  widthCm: number;
  heightCm: number;
  textureUrl: string;
  /** Fotos de detalle generadas por `generatePaintingDetails` — casi siempre
   * vacío, es a petición. Con al menos una, la lupa las usa al acercarse
   * mucho al lienzo en vez de ampliar `textureUrl` (ver `build-room.ts`). */
  detailUrls: string[];
};

export type HungPainting = RoomPainting & {
  /** Metros. La obra se cuelga a escala real. */
  width: number;
  height: number;
  /** Centro del cuadro en coordenadas de la sala. */
  x: number;
  y: number;
};

export const WALL_HEIGHT = 3.2;
export const EYE_LEVEL = 1.55;
const GAP = 0.9;
const SIDE_MARGIN = 1.5;

/**
 * Coloca las obras en fila sobre la pared, centradas a la altura de los ojos
 * (convención de museo: el centro del cuadro a 1,55 m) y separadas por un
 * hueco fijo. Devuelve también el ancho de pared necesario.
 */
export function hangPaintings(paintings: RoomPainting[]): {
  hung: HungPainting[];
  wallWidth: number;
} {
  const sized = paintings.map((painting) => ({
    ...painting,
    width: painting.widthCm / 100,
    height: painting.heightCm / 100,
  }));

  const total =
    sized.reduce((sum, p) => sum + p.width, 0) +
    GAP * Math.max(sized.length - 1, 0);

  let cursor = -total / 2;
  const hung = sized.map((painting) => {
    const x = cursor + painting.width / 2;
    cursor += painting.width + GAP;
    return { ...painting, x, y: EYE_LEVEL };
  });

  return { hung, wallWidth: Math.max(total + SIDE_MARGIN * 2, 8) };
}

export type RoomSection = {
  id: string;
  slug: string;
  title: string;
  paintings: RoomPainting[];
};

export type Room = {
  id: string;
  slug: string;
  title: string;
  hung: HungPainting[];
  wallWidth: number;
};

/** Precalcula la geometría de cada sección: una sala 3D lista para montar. */
export function buildRooms(sections: RoomSection[]): Room[] {
  return sections.map((section) => {
    const { hung, wallWidth } = hangPaintings(section.paintings);
    return { id: section.id, slug: section.slug, title: section.title, hung, wallWidth };
  });
}
