/**
 * Defensa CSRF complementaria a SameSite=Lax: toda petición mutante debe
 * llegar con Origin (o Referer) del propio host.
 */
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  if (!host) return false;

  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return false;

  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

export function forbiddenIfCrossOrigin(request: Request): Response | null {
  return isSameOrigin(request)
    ? null
    : Response.json({ error: "Origen no permitido" }, { status: 403 });
}

/** IP del cliente detrás del proxy de Dokploy/Traefik. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "desconocida";
}
