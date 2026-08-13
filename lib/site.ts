/**
 * Identidad del sitio para metadata, iconos y og:image.
 *
 * El nombre vive en una variable de entorno y no en la base de datos a
 * propósito: el layout raíz y la og:image se renderizan en sitios donde no
 * conviene depender de Postgres (y el build de Next no lo tiene delante). La
 * ficha de artista sigue mandando en las páginas públicas, que sí consultan.
 */
export const SITE_NAME = process.env.PUBLIC_SITE_NAME?.trim() || "Casa Margarita";

export const SITE_URL = process.env.PUBLIC_URL?.trim() || "http://localhost:3000";

export const SITE_DESCRIPTION =
  process.env.PUBLIC_SITE_DESCRIPTION?.trim() ||
  "Obra original al óleo: catálogo con medidas, técnica y disponibilidad.";
