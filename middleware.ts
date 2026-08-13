import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth/session";
import {
  NONCE_HEADER,
  contentSecurityPolicy,
  createNonce,
  securityHeaders,
} from "@/lib/http/security-headers";

// Runtime Edge: solo se verifica la firma del JWT (jose usa WebCrypto).
// argon2 y Prisma nunca se tocan aquí.
// Rutas de sesión: no pueden exigir sesión previa.
const PUBLIC_API = new Set(["/api/admin/login", "/api/admin/logout"]);

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Decide si la petición pasa. Devuelve `null` cuando no hay nada que cortar:
 * así el que llama sabe que puede seguir con la respuesta normal.
 */
async function authorize(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return null;
  }
  if (PUBLIC_API.has(pathname)) return null;

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin/login") {
    return session
      ? NextResponse.redirect(new URL("/admin", request.url))
      : null;
  }

  if (session) return null;

  // Las rutas de API responden 401; las páginas redirigen al login.
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export async function middleware(request: NextRequest) {
  const nonce = createNonce();
  const csp = contentSecurityPolicy({ nonce, isDevelopment });

  const blocked = await authorize(request);

  // El nonce viaja también en la petición: Next lo lee de ahí para firmar sus
  // propios scripts de arranque, y los Server Components lo recogen con
  // `headers()` para los bloques de datos estructurados.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  // El layout raíz lo necesita para poner el `lang` correcto en <html>: las
  // páginas en inglés cuelgan de /en y no hay otra forma de saberlo desde ahí.
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response =
    blocked ?? NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);
  for (const [name, value] of Object.entries(securityHeaders({ isDevelopment }))) {
    response.headers.set(name, value);
  }

  return response;
}

export const config = {
  /**
   * Todo menos los ficheros que sirve Next tal cual. Las cabeceras tienen que
   * llegar a la web pública entera, no solo al panel; las imágenes subidas
   * (`/api/uploads`) sí pasan, porque las sirve una ruta nuestra.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
  ],
};
