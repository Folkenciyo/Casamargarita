/**
 * Registro estructurado en JSON, una línea por suceso.
 *
 * Sin dependencias a propósito: la app corre como un proceso en Docker y
 * Dokploy recoge lo que sale por la salida estándar. Una librería de registro
 * aportaría transportes y rotación que aquí hace el contenedor.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

type Campos = Record<string, unknown>;

/**
 * Claves que nunca deben acabar en un fichero de registro, ni siquiera por
 * accidente al volcar un objeto entero. Se comparan en minúsculas y por
 * inclusión: `ADMIN_PASSWORD_HASH` y `sessionToken` caen igual.
 */
const SECRETOS = [
  "password",
  "contraseña",
  "secret",
  "token",
  "cookie",
  "authorization",
  "hash",
  "smtp_pass",
];

function esSecreto(clave: string): boolean {
  const normalizada = clave.toLowerCase();
  return SECRETOS.some((secreto) => normalizada.includes(secreto));
}

/** Convierte un Error en algo que sobrevive a `JSON.stringify`. */
function serializarError(error: unknown): Campos {
  if (error instanceof Error) {
    return {
      nombre: error.name,
      mensaje: error.message,
      // La traza solo fuera de producción: en producción llena el registro y
      // rara vez dice más que el mensaje y la ruta.
      pila: process.env.NODE_ENV === "production" ? undefined : error.stack,
      causa: error.cause ? String(error.cause) : undefined,
    };
  }
  return { mensaje: String(error) };
}

function limpiar(campos: Campos, profundidad = 0): Campos {
  if (profundidad > 4) return {};

  const salida: Campos = {};
  for (const [clave, valor] of Object.entries(campos)) {
    if (esSecreto(clave)) {
      salida[clave] = "[oculto]";
    } else if (valor instanceof Error) {
      salida[clave] = serializarError(valor);
    } else if (valor && typeof valor === "object" && !Array.isArray(valor)) {
      salida[clave] = limpiar(valor as Campos, profundidad + 1);
    } else {
      salida[clave] = valor;
    }
  }
  return salida;
}

function emitir(nivel: LogLevel, mensaje: string, campos: Campos = {}): void {
  const linea = JSON.stringify({
    nivel,
    mensaje,
    momento: new Date().toISOString(),
    ...limpiar(campos),
  });

  // error y warn a stderr, el resto a stdout: es lo que espera cualquier
  // recolector de registros, incluido el de Docker.
  if (nivel === "error" || nivel === "warn") process.stderr.write(`${linea}\n`);
  else process.stdout.write(`${linea}\n`);
}

export const log = {
  debug: (mensaje: string, campos?: Campos) => {
    if (process.env.NODE_ENV !== "production") emitir("debug", mensaje, campos);
  },
  info: (mensaje: string, campos?: Campos) => emitir("info", mensaje, campos),
  warn: (mensaje: string, campos?: Campos) => emitir("warn", mensaje, campos),
  error: (mensaje: string, error?: unknown, campos?: Campos) =>
    emitir("error", mensaje, { ...campos, error: serializarError(error) }),
};
