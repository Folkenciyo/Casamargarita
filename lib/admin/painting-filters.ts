import { PAINTING_STATUSES } from "@/lib/validation/painting";

export type PaintingStatus = (typeof PAINTING_STATUSES)[number];
export type Visibility = "all" | "published" | "hidden";
export type PhotoFilter = "all" | "with" | "without";

export type PaintingFilters = {
  q: string;
  status: PaintingStatus | null;
  visibility: Visibility;
  photo: PhotoFilter;
  /** La papelera es una vista aparte, no un filtro más: o se ve o no se ve. */
  papelera: boolean;
  page: number;
};

export const EMPTY_FILTERS: PaintingFilters = {
  q: "",
  status: null,
  visibility: "all",
  photo: "all",
  papelera: false,
  page: 1,
};

/**
 * Lee los filtros de la lista de obras desde la URL. Todo valor raro
 * (`?estado=zzz`, `?page=-3`) cae en el valor por defecto en lugar de
 * reventar: la barra de direcciones es entrada de usuario como cualquier otra.
 */
export function parsePaintingFilters(params: {
  q?: string;
  estado?: string;
  visibilidad?: string;
  foto?: string;
  papelera?: string;
  page?: string;
}): PaintingFilters {
  const status = PAINTING_STATUSES.find((value) => value === params.estado);

  const visibility: Visibility =
    params.visibilidad === "publicadas"
      ? "published"
      : params.visibilidad === "ocultas"
        ? "hidden"
        : "all";

  const photo: PhotoFilter =
    params.foto === "sin" ? "without" : params.foto === "con" ? "with" : "all";

  const page = Number(params.page);

  return {
    q: params.q?.trim() ?? "",
    status: status ?? null,
    visibility,
    photo,
    papelera: params.papelera === "si",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** ¿Hay algún filtro puesto? Con filtros no se puede reordenar a ciegas. */
export function hasActiveFilters(filters: PaintingFilters): boolean {
  return (
    filters.q !== "" ||
    filters.status !== null ||
    filters.visibility !== "all" ||
    filters.photo !== "all"
  );
}

/**
 * El `where` de Prisma correspondiente. Sin campos vacíos: solo lo pedido.
 *
 * `deletedAt` va siempre, no como opción: si se olvidara, la obra que la
 * artista mandó a la papelera reaparecería en la lista como si nada.
 */
export function paintingWhere(filters: PaintingFilters) {
  return {
    deletedAt: filters.papelera ? { not: null } : null,
    ...(filters.q
      ? { title: { contains: filters.q, mode: "insensitive" as const } }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.visibility === "all"
      ? {}
      : { published: filters.visibility === "published" }),
    ...(filters.photo === "all"
      ? {}
      : filters.photo === "without"
        ? { images: { none: {} } }
        : { images: { some: {} } }),
  };
}

/**
 * Reconstruye la URL de la lista conservando los filtros. Los valores por
 * defecto no se escriben: /admin/obras se lee mejor que
 * /admin/obras?q=&estado=&visibilidad=all&page=1.
 */
export function paintingsHref(
  filters: PaintingFilters,
  overrides: Partial<PaintingFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (merged.q) params.set("q", merged.q);
  if (merged.status) params.set("estado", merged.status);
  if (merged.visibility !== "all") {
    params.set(
      "visibilidad",
      merged.visibility === "published" ? "publicadas" : "ocultas",
    );
  }
  if (merged.photo !== "all") {
    params.set("foto", merged.photo === "without" ? "sin" : "con");
  }
  if (merged.papelera) params.set("papelera", "si");
  if (merged.page > 1) params.set("page", String(merged.page));

  const qs = params.toString();
  return qs ? `/admin/obras?${qs}` : "/admin/obras";
}
