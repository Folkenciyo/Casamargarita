import slugify from "slugify";

export const PRICE_ON_REQUEST = "Precio a consultar";

/**
 * Formatea un precio guardado en céntimos. `null` = precio a consultar.
 * Sin decimales: los precios de obra son cifras redondas.
 */
export function formatPrice(
  cents: number | null | undefined,
  currency = "EUR",
  locale = "es-ES",
): string {
  if (cents === null || cents === undefined) return PRICE_ON_REQUEST;
  if (!Number.isFinite(cents) || cents < 0) {
    throw new RangeError(`Precio inválido: ${cents}`);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** "100 × 81 cm" — ancho por alto, convención de catálogo. */
export function formatDimensions(widthCm: number, heightCm: number): string {
  if (!Number.isInteger(widthCm) || !Number.isInteger(heightCm)) {
    throw new TypeError("Las medidas se guardan en centímetros enteros");
  }
  if (widthCm <= 0 || heightCm <= 0) {
    throw new RangeError("Las medidas deben ser positivas");
  }
  return `${widthCm} × ${heightCm} cm`;
}

export function toSlug(title: string): string {
  const slug = slugify(title, { lower: true, strict: true, locale: "es" });
  if (!slug) throw new RangeError("El título no produce un slug válido");
  return slug;
}

/**
 * Añade sufijo numérico hasta encontrar un slug libre: "luz", "luz-2", "luz-3".
 * `taken` recibe el candidato y responde si ya existe.
 */
export async function uniqueSlug(
  title: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = toSlug(title);
  let candidate = base;
  let n = 1;
  while (await taken(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}
