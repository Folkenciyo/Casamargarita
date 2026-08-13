/**
 * Cabeceras de seguridad. Se calculan aquí, fuera del middleware, para poder
 * probarlas sin levantar un servidor.
 */

/** Nombre de la cabecera que lleva el nonce a los Server Components. */
export const NONCE_HEADER = "x-nonce";

/**
 * `style-src` admite 'unsafe-inline' a conciencia: next/font inyecta la
 * declaración de las fuentes como estilo en línea y Tailwind hace lo propio
 * con las variables del tema. Un nonce ahí obligaría a reescribir cómo se
 * cargan ambas cosas para cerrar un hueco que no abre nada: los estilos no
 * ejecutan código.
 *
 * En desarrollo hace falta aflojar dos tuercas más — `eval` para el recargado
 * en caliente y `ws:` para su canal — así que la política estricta de verdad
 * es la que viaja a producción, que es donde importa.
 */
export function contentSecurityPolicy({
  nonce,
  isDevelopment = false,
}: {
  nonce: string;
  isDevelopment?: boolean;
}): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    // Con 'strict-dynamic' los scripts que cargue uno ya autorizado heredan
    // el permiso: es lo que permite que el arranque de Next no lleve lista.
    "'strict-dynamic'",
    isDevelopment ? "'unsafe-eval'" : "",
  ].filter(Boolean);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    // data: son los placeholders borrosos; blob:, los lienzos de la capa WebGL.
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": isDevelopment ? ["'self'", "ws:"] : ["'self'"],
    "media-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "worker-src": ["'self'", "blob:"],
  };

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");

  // En local se sirve por http: pedir el ascenso a https rompería la
  // navegación en lugar de protegerla.
  return isDevelopment ? policy : `${policy}; upgrade-insecure-requests`;
}

/**
 * Cabeceras fijas, iguales en toda petición.
 *
 * `Permissions-Policy` apaga lo que esta web no usa jamás. Ojo con la sala 3D:
 * usa WebGL, que no se pide por permisos, así que apagar cámara y micrófono no
 * la afecta.
 */
export function securityHeaders({
  isDevelopment = false,
}: { isDevelopment?: boolean } = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  };

  // HSTS solo con TLS por delante. Enviarlo desde http en local dejaría el
  // navegador convencido de que localhost es https durante un año.
  if (!isDevelopment) {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains";
  }

  return headers;
}

/** Nonce nuevo por petición. WebCrypto: el middleware corre en Edge. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
