import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { CACHE_TAGS, invalidar, type CacheTag } from "@/lib/cache";

export const dynamic = "force-dynamic";

const TODAS = Object.values(CACHE_TAGS) as CacheTag[];

/** Compara sin filtrar por el tiempo de respuesta cuántos caracteres cuadran. */
function coincide(enviado: string, esperado: string): boolean {
  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Vacía el caché de datos desde fuera de la aplicación.
 *
 * Las escrituras del panel invalidan sus etiquetas solas; esto es para lo que
 * entra en Postgres por otro camino —restaurar una copia, sembrar la galería,
 * la suite E2E—, porque `revalidateTag` solo funciona dentro del servidor de
 * Next: un script suelto no puede tocar este caché aunque comparta contenedor.
 *
 * Sin `REVALIDATE_SECRET` la ruta responde 404 y no existe: nace apagada, y en
 * una instalación normal no hace falta encenderla.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const esperado = process.env.REVALIDATE_SECRET;
  if (!esperado) return new NextResponse(null, { status: 404 });

  const enviado = request.headers.get("x-revalidate-secret") ?? "";
  if (!coincide(enviado, esperado)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  invalidar(...TODAS);
  return NextResponse.json({ ok: true, etiquetas: TODAS });
}
