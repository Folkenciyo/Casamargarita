import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth/session";

// Runtime Edge: solo se verifica la firma del JWT (jose usa WebCrypto).
// argon2 y Prisma nunca se tocan aquí.
// Rutas de sesión: no pueden exigir sesión previa.
const PUBLIC_API = new Set(["/api/admin/login", "/api/admin/logout"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_API.has(pathname)) return NextResponse.next();

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin/login") {
    return session
      ? NextResponse.redirect(new URL("/admin", request.url))
      : NextResponse.next();
  }

  if (session) return NextResponse.next();

  // Las rutas de API responden 401; las páginas redirigen al login.
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
