import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Las etiquetas del caché de datos.
 *
 * Son de conjunto y no por obra: el catálogo son decenas de piezas, no miles.
 * Una etiqueta por slug multiplicaría las invalidaciones que hay que acordarse
 * de escribir a cambio de ahorrar una consulta que dura milisegundos, y
 * olvidar una sola dejaría al público mirando una ficha vieja.
 */
export const CACHE_TAGS = {
  /** Ficha de la artista, trayectoria y ajustes del sitio (fila `singleton`). */
  artist: "artist",
  paintings: "paintings",
  series: "series",
  journal: "journal",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Techo de frescura, en segundos.
 *
 * Quien pone al día el sitio son las etiquetas: cada escritura del panel
 * invalida las suyas y el cambio se ve en la siguiente visita. El techo es el
 * seguro para lo que se escriba por fuera del panel —una migración, el script
 * de la papelera—: sin él, ese cambio no se vería nunca.
 */
export const CACHE_TTL_SECONDS = 3600;

/**
 * Envuelve una consulta de lectura pública en el caché de datos de Next.
 *
 * Dos avisos sobre lo que se devuelve desde aquí:
 *
 * 1. Next guarda el resultado con `JSON.stringify` y lo recupera con
 *    `JSON.parse`, así que **una `Date` vuelve convertida en texto** aunque
 *    TypeScript siga creyendo que es una fecha. Las consultas cacheadas piden
 *    con `select` lo que necesitan y declaran las fechas como `string`.
 * 2. La `clave` identifica la entrada: dos consultas distintas con la misma
 *    clave se pisarían la una a la otra. Una por función.
 */
export function cacheado<Args extends unknown[], Resultado>(
  clave: string,
  tags: readonly CacheTag[],
  consulta: (...args: Args) => Promise<Resultado>,
): (...args: Args) => Promise<Resultado> {
  return unstable_cache(consulta, [clave], {
    tags: [...tags],
    revalidate: CACHE_TTL_SECONDS,
  });
}

/**
 * Marca como caducado todo lo cacheado bajo esas etiquetas. Se llama desde las
 * Server Actions del panel, después de escribir.
 */
export function invalidar(...tags: readonly CacheTag[]): void {
  for (const tag of new Set(tags)) revalidateTag(tag);
}
