import { log } from "@/lib/log";

/**
 * Next llama aquí ante cualquier error de servidor que no haya atrapado nadie:
 * en una página, en una Server Action o en una ruta de API.
 *
 * Esta es la pieza que faltaba para que un fallo en producción exista aunque
 * nadie esté mirando los registros del contenedor. El `digest` es el mismo que
 * ve el visitante en la página de error, así que un aviso por correo se puede
 * cruzar con la línea del registro.
 */
export function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: string; routePath: string; renderSource: string },
): void {
  log.error("error no atrapado en el servidor", error, {
    ruta: request.path,
    metodo: request.method,
    digest:
      error && typeof error === "object" && "digest" in error
        ? String(error.digest)
        : undefined,
    router: context.routerKind,
    plantilla: context.routePath,
    origen: context.renderSource,
    // El resto de cabeceras puede llevar cookies de sesión: no entran.
    agente: request.headers["user-agent"],
  });
}
