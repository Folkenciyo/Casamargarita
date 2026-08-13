import type { APIRequestContext } from "@playwright/test";

/**
 * Vacía el caché de datos del servidor.
 *
 * Hay que llamarlo **siempre que un test escriba en Postgres con Prisma** y
 * luego mire una página pública. Las vistas públicas leen de un caché con
 * etiquetas que solo invalidan las Server Actions del panel; una escritura
 * directa se las salta, y la página seguiría enseñando lo de antes.
 *
 * No es un apaño para los tests: la base de datos de la suite es efímera y se
 * rehace en cada ejecución, pero el caché vive en `.next/cache` y sobrevive.
 * Sin esto, un test pasa la primera vez y falla la siguiente.
 */
export async function revalidarCache(request: APIRequestContext): Promise<void> {
  const secreto = process.env.REVALIDATE_SECRET;
  if (!secreto) {
    throw new Error(
      "Falta REVALIDATE_SECRET: sin él no se puede vaciar el caché y los tests que escriben con Prisma darán resultados que dependen de la ejecución anterior.",
    );
  }

  const respuesta = await request.post("/api/revalidate", {
    headers: { "x-revalidate-secret": secreto },
  });

  if (!respuesta.ok()) {
    throw new Error(
      `No se pudo vaciar el caché: ${respuesta.status()} ${await respuesta.text()}`,
    );
  }
}
