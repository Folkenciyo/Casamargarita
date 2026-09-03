import { revalidatePath } from "next/cache";
import { CACHE_TAGS, invalidar } from "@/lib/cache";

/**
 * Aparte de las Server Actions para que también lo use la ruta API de subida
 * con progreso (app/api/admin/obras/[id]/imagenes): un módulo sin "use server"
 * se puede importar desde un Route Handler sin pasar por la capa de RPC de
 * las Server Actions.
 */
export function refreshPublicViews(slug?: string): void {
  // Las vistas públicas leen del caché de datos: sin caducar la etiqueta, el
  // cambio no se vería aunque se refresque la página.
  invalidar(CACHE_TAGS.paintings);
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/admin");
  revalidatePath("/admin/obras");
  if (slug) revalidatePath(`/obra/${slug}`);
}

/** La ficha, el retrato y los ajustes viven todos en la fila `singleton`. */
export function refreshArtist(): void {
  invalidar(CACHE_TAGS.artist);
  revalidatePath("/artista");
  revalidatePath("/admin/artista");
}
