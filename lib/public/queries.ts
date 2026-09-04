import { CACHE_TAGS, cacheado } from "@/lib/cache";
import { enlaceAObra, visiblePaintingFilter } from "@/lib/catalog";
import { prisma } from "@/lib/db";
import { galeriaWhere, type FiltrosGaleria } from "@/lib/public/gallery-filters";
import { agruparPorSeccion } from "@/lib/public/room-sections";

/**
 * Las lecturas del sitio público, cacheadas por etiquetas.
 *
 * Tres reglas que se siguen en todas las de este fichero:
 *
 * - **`select` explícito.** Lo que no se pide no viaja ni ocupa caché.
 * - **Ninguna `Date` sale de aquí.** Next guarda estas respuestas como JSON y
 *   una fecha volvería convertida en texto con el tipo mintiendo (ver
 *   `lib/cache.ts`). Las fechas se convierten a ISO antes de devolverlas.
 * - **El ajuste de obra vendida entra como argumento**, no se lee dentro. Así
 *   forma parte de la clave: al cambiar el interruptor, las visitas pasan a
 *   otra entrada del caché en vez de esperar una invalidación.
 */

const CAMPOS_IMAGEN = {
  id: true,
  basePath: true,
  width: true,
  height: true,
  widths: true,
  blurDataUrl: true,
  alt: true,
} as const;

/** Lo que pinta `<PaintingCard>`, ni un campo más. */
const CAMPOS_TARJETA = {
  id: true,
  slug: true,
  title: true,
  year: true,
  widthCm: true,
  heightCm: true,
  priceCents: true,
  currency: true,
  status: true,
  images: { where: { isPrimary: true }, take: 1, select: CAMPOS_IMAGEN },
} as const;

// ---------------------------------------------------------------------------
// Cabecera y pie: van en todas las páginas públicas
// ---------------------------------------------------------------------------

/**
 * Nombre, contacto y si el diario tiene algo que enseñar. Lo pide el layout,
 * así que se sirve en cada visita al sitio: es la lectura que más veces se
 * ahorra.
 */
export const cabeceraPublica = cacheado(
  "cabecera-publica",
  [CACHE_TAGS.artist, CACHE_TAGS.journal],
  async () => {
    const [artist, entradasPublicadas] = await Promise.all([
      prisma.artist.findUnique({
        where: { id: "singleton" },
        select: { name: true, instagram: true, email: true },
      }),
      prisma.journalEntry.count({ where: { published: true } }),
    ]);

    return {
      name: artist?.name ?? null,
      instagram: artist?.instagram ?? null,
      email: artist?.email ?? null,
      hayDiario: entradasPublicadas > 0,
    };
  },
);

// ---------------------------------------------------------------------------
// Obra
// ---------------------------------------------------------------------------

/** La obra destacada de la portada: una de portada y seis debajo. */
export const obraDestacada = cacheado(
  "obra-destacada",
  [CACHE_TAGS.paintings],
  async (mostrarVendidas: boolean) => {
    return prisma.painting.findMany({
      where: { ...visiblePaintingFilter(mostrarVendidas), featured: true },
      orderBy: { featuredPosition: "asc" },
      take: 7,
      select: CAMPOS_TARJETA,
    });
  },
);

/**
 * Una página de la galería con sus filtros. La cuenta va en la misma entrada
 * que las obras: se piden siempre juntas y separarlas duplicaría las claves.
 */
export const paginaGaleria = cacheado(
  "pagina-galeria",
  [CACHE_TAGS.paintings],
  async (
    mostrarVendidas: boolean,
    filtros: FiltrosGaleria,
    serieId: string | null,
    porPagina: number,
  ) => {
    // El filtro de visibilidad va primero: lo que el visitante añade solo puede
    // restringir más, nunca destapar obra que la artista ha ocultado.
    const where = {
      ...visiblePaintingFilter(mostrarVendidas),
      ...galeriaWhere(filtros, serieId),
    };

    const [total, obras] = await Promise.all([
      prisma.painting.count({ where }),
      prisma.painting.findMany({
        where,
        orderBy: { position: "asc" },
        skip: (filtros.pagina - 1) * porPagina,
        take: porPagina,
        select: CAMPOS_TARJETA,
      }),
    ]);

    return { total, obras };
  },
);

/** La ficha de una obra. `null` si no existe o no es visible. */
export const obraPublica = cacheado(
  "obra-publica",
  [CACHE_TAGS.paintings, CACHE_TAGS.series],
  async (slug: string, mostrarVendidas: boolean) => {
    return prisma.painting.findFirst({
      // Con las vendidas ocultas, su ficha tampoco existe: quien llegue por un
      // enlace viejo ve un 404, no una obra que ya no está en el catálogo.
      where: { slug, ...visiblePaintingFilter(mostrarVendidas) },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        year: true,
        technique: true,
        widthCm: true,
        heightCm: true,
        priceCents: true,
        currency: true,
        status: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          select: CAMPOS_IMAGEN,
        },
        // Solo se enseña la serie si ella misma está publicada: una serie
        // oculta no debe asomar por la ficha de sus obras.
        series: { select: { slug: true, title: true, published: true } },
      },
    });
  },
);

/** Las obras que cuelga la sala en tres dimensiones, agrupadas por serie. */
export const obrasSalaPorSecciones = cacheado(
  "obras-sala-secciones",
  [CACHE_TAGS.paintings, CACHE_TAGS.series],
  async (mostrarVendidas: boolean) => {
    const [paintings, series] = await Promise.all([
      prisma.painting.findMany({
        where: visiblePaintingFilter(mostrarVendidas),
        orderBy: { position: "asc" },
        select: {
          slug: true,
          title: true,
          status: true,
          priceCents: true,
          currency: true,
          widthCm: true,
          heightCm: true,
          images: { where: { isPrimary: true }, take: 1, select: CAMPOS_IMAGEN },
          series: { select: { id: true, slug: true, title: true, published: true } },
        },
      }),
      prisma.series.findMany({
        where: { published: true },
        orderBy: { position: "asc" },
        select: { id: true, slug: true, title: true },
      }),
    ]);

    return agruparPorSeccion(paintings, series);
  },
);

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

/** Las series publicadas, para los filtros de la galería. */
export const seriesPublicadas = cacheado(
  "series-publicadas",
  [CACHE_TAGS.series],
  async () => {
    return prisma.series.findMany({
      where: { published: true },
      orderBy: { position: "asc" },
      select: { id: true, slug: true, title: true },
    });
  },
);

/** Una serie con su obra. `null` si no existe o no está publicada. */
export const seriePublica = cacheado(
  "serie-publica",
  [CACHE_TAGS.series, CACHE_TAGS.paintings],
  async (slug: string, mostrarVendidas: boolean) => {
    const serie = await prisma.series.findFirst({
      where: { slug, published: true },
      select: { id: true, slug: true, title: true, description: true },
    });
    if (!serie) return null;

    const paintings = await prisma.painting.findMany({
      where: { ...visiblePaintingFilter(mostrarVendidas), seriesId: serie.id },
      orderBy: { position: "asc" },
      select: CAMPOS_TARJETA,
    });

    return { serie, paintings };
  },
);

// ---------------------------------------------------------------------------
// Diario
// ---------------------------------------------------------------------------

/** Lo que se enseña de la obra desde el diario, si sigue visible. */
const CAMPOS_OBRA_ENLAZADA = {
  slug: true,
  title: true,
  published: true,
  deletedAt: true,
} as const;

export const entradasDiario = cacheado(
  "entradas-diario",
  [CACHE_TAGS.journal, CACHE_TAGS.paintings],
  async () => {
    const entradas = await prisma.journalEntry.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        publishedAt: true,
        images: { orderBy: { position: "asc" }, take: 1, select: CAMPOS_IMAGEN },
        painting: { select: CAMPOS_OBRA_ENLAZADA },
      },
    });

    return entradas.map((entrada) => ({
      ...entrada,
      publishedAt: entrada.publishedAt.toISOString(),
      painting: enlaceAObra(entrada.painting),
    }));
  },
);

export const entradaDiario = cacheado(
  "entrada-diario",
  [CACHE_TAGS.journal, CACHE_TAGS.paintings],
  async (slug: string) => {
    const entrada = await prisma.journalEntry.findFirst({
      where: { slug, published: true },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        body: true,
        publishedAt: true,
        updatedAt: true,
        images: {
          orderBy: { position: "asc" },
          select: { ...CAMPOS_IMAGEN, caption: true },
        },
        painting: { select: CAMPOS_OBRA_ENLAZADA },
      },
    });
    if (!entrada) return null;

    return {
      ...entrada,
      publishedAt: entrada.publishedAt.toISOString(),
      updatedAt: entrada.updatedAt.toISOString(),
      painting: enlaceAObra(entrada.painting),
    };
  },
);

// ---------------------------------------------------------------------------
// La artista
// ---------------------------------------------------------------------------

export const fichaArtista = cacheado(
  "ficha-artista",
  [CACHE_TAGS.artist],
  async () => {
    return prisma.artist.findUnique({
      where: { id: "singleton" },
      select: {
        name: true,
        statement: true,
        bio: true,
        email: true,
        instagram: true,
        portraitPath: true,
        portraitWidth: true,
        portraitHeight: true,
        portraitWidths: true,
        portraitBlurDataUrl: true,
      },
    });
  },
);

export const hitosPublicados = cacheado(
  "hitos-publicados",
  [CACHE_TAGS.artist],
  async () => {
    return prisma.milestone.findMany({
      where: { published: true },
      orderBy: [{ year: "desc" }, { position: "desc" }],
      select: {
        id: true,
        kind: true,
        title: true,
        place: true,
        year: true,
        url: true,
      },
    });
  },
);

/**
 * Los títulos y direcciones de la obra visible, para los datos estructurados
 * de la ficha de artista: así el buscador sabe que estos cuadros son suyos.
 */
export const obrasParaDatosEstructurados = cacheado(
  "obras-datos-estructurados",
  [CACHE_TAGS.paintings],
  async (mostrarVendidas: boolean, limite: number) => {
    return prisma.painting.findMany({
      where: visiblePaintingFilter(mostrarVendidas),
      orderBy: { position: "asc" },
      take: limite,
      select: { slug: true, title: true },
    });
  },
);

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

/** Direcciones y fecha de último cambio de todo lo que se anuncia. */
export const rutasSitemap = cacheado(
  "rutas-sitemap",
  [CACHE_TAGS.paintings, CACHE_TAGS.series, CACHE_TAGS.journal],
  async (mostrarVendidas: boolean) => {
    const [paintings, series, entradas] = await Promise.all([
      prisma.painting.findMany({
        // Una obra que no sale en la galería tampoco se anuncia a los buscadores.
        where: visiblePaintingFilter(mostrarVendidas),
        select: { slug: true, updatedAt: true },
      }),
      prisma.series.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.journalEntry.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const aIso = <T extends { updatedAt: Date }>(fila: T) => ({
      ...fila,
      updatedAt: fila.updatedAt.toISOString(),
    });

    return {
      paintings: paintings.map(aIso),
      series: series.map(aIso),
      entradas: entradas.map(aIso),
    };
  },
);
