import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  createNonce,
  securityHeaders,
} from "./security-headers";

function directiva(politica: string, nombre: string): string {
  const encontrada = politica
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte === nombre || parte.startsWith(`${nombre} `));
  if (!encontrada) throw new Error(`No hay directiva "${nombre}" en la política`);
  return encontrada;
}

describe("contentSecurityPolicy", () => {
  const produccion = contentSecurityPolicy({ nonce: "abc123" });
  const desarrollo = contentSecurityPolicy({
    nonce: "abc123",
    isDevelopment: true,
  });

  it("firma los scripts con el nonce de la petición", () => {
    expect(directiva(produccion, "script-src")).toContain("'nonce-abc123'");
  });

  it("cierra lo que no se usa nunca", () => {
    expect(directiva(produccion, "object-src")).toBe("object-src 'none'");
    expect(directiva(produccion, "frame-ancestors")).toBe(
      "frame-ancestors 'none'",
    );
    expect(directiva(produccion, "base-uri")).toBe("base-uri 'self'");
    expect(directiva(produccion, "form-action")).toBe("form-action 'self'");
  });

  // El agujero clásico: un 'unsafe-inline' en script-src anula el nonce entero.
  it("no deja ejecutar scripts en línea sin firmar", () => {
    expect(directiva(produccion, "script-src")).not.toContain("'unsafe-inline'");
  });

  it("permite los placeholders borrosos y los lienzos de la capa WebGL", () => {
    const imagenes = directiva(produccion, "img-src");
    expect(imagenes).toContain("data:");
    expect(imagenes).toContain("blob:");
  });

  it("en producción no admite eval ni conexiones fuera del propio origen", () => {
    expect(directiva(produccion, "script-src")).not.toContain("'unsafe-eval'");
    expect(directiva(produccion, "connect-src")).toBe("connect-src 'self'");
    expect(produccion).toContain("upgrade-insecure-requests");
  });

  // `next dev` recompila con eval y avisa por websocket: sin esto, la web no
  // arranca en local ni corren las pruebas de extremo a extremo.
  it("en desarrollo afloja solo lo que el recargado en caliente necesita", () => {
    expect(directiva(desarrollo, "script-src")).toContain("'unsafe-eval'");
    expect(directiva(desarrollo, "connect-src")).toContain("ws:");
    expect(desarrollo).not.toContain("upgrade-insecure-requests");
  });
});

describe("securityHeaders", () => {
  it("manda las cabeceras de siempre", () => {
    const cabeceras = securityHeaders();

    expect(cabeceras["X-Content-Type-Options"]).toBe("nosniff");
    expect(cabeceras["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(cabeceras["X-Frame-Options"]).toBe("DENY");
    expect(cabeceras["Permissions-Policy"]).toContain("camera=()");
  });

  it("pide https permanente solo en producción", () => {
    expect(securityHeaders()["Strict-Transport-Security"]).toContain(
      "max-age=31536000",
    );
    // En local se sirve por http: la cabecera dejaría el navegador convencido
    // de que localhost es https durante un año.
    expect(
      securityHeaders({ isDevelopment: true })["Strict-Transport-Security"],
    ).toBeUndefined();
  });
});

describe("createNonce", () => {
  it("no repite", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => createNonce()));
    expect(nonces.size).toBe(200);
  });

  it("cabe en una cabecera sin escapar nada", () => {
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });
});
