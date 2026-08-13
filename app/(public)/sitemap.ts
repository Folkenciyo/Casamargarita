import type { MetadataRoute } from "next";
import { rutasSitemap } from "@/lib/public/queries";
import { ajustesPublicos } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const base = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { showSoldPaintings } = await ajustesPublicos();
  const { paintings, series, entradas } = await rutasSitemap(showSoldPaintings);

  /** Enlaza cada dirección con su equivalente en el otro idioma. */
  const conAlternativas = (camino: string) => ({
    languages: {
      es: `${base}${camino}`,
      en: `${base}/en${camino}`,
    },
  });

  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    {
      url: `${base}/galeria`,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: conAlternativas("/galeria"),
    },
    {
      url: `${base}/en/galeria`,
      changeFrequency: "weekly",
      priority: 0.6,
      alternates: conAlternativas("/galeria"),
    },
    { url: `${base}/artista`, changeFrequency: "yearly", priority: 0.5 },
    // Por encima de la obra suelta: una serie reúne varias obras y un texto
    // propio, así que es mejor puerta de entrada desde un buscador.
    ...series.map((serie) => ({
      url: `${base}/serie/${serie.slug}`,
      lastModified: serie.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...paintings.map((painting) => ({
      url: `${base}/obra/${painting.slug}`,
      lastModified: painting.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: conAlternativas(`/obra/${painting.slug}`),
    })),
    // La ficha en inglés se declara con menos prioridad: el idioma de la casa
    // es el español y es el que debe salir primero en una búsqueda en español.
    ...paintings.map((painting) => ({
      url: `${base}/en/obra/${painting.slug}`,
      lastModified: painting.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
      alternates: conAlternativas(`/obra/${painting.slug}`),
    })),
    // El diario solo aparece si hay algo escrito: anunciar una página vacía
    // a los buscadores no ayuda a nadie.
    ...(entradas.length > 0
      ? [
          {
            url: `${base}/diario`,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
        ]
      : []),
    ...entradas.map((entrada) => ({
      url: `${base}/diario/${entrada.slug}`,
      lastModified: entrada.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
