import { esFormato, formatoWhere, type Formato } from "@/lib/formats";
import { ruta, type Idioma } from "@/lib/i18n/dictionaries";

export type FiltrosGaleria = {
  formato: Formato | null;
  serie: string | null;
  soloDisponibles: boolean;
  pagina: number;
};

export const SIN_FILTROS: FiltrosGaleria = {
  formato: null,
  serie: null,
  soloDisponibles: false,
  pagina: 1,
};

/**
 * Filtros de la galería pública, leídos de la URL. Igual que en el panel,
 * cualquier valor que no reconozcamos se ignora en lugar de romper la página:
 * la barra de direcciones es entrada de usuario.
 */
export function parseFiltrosGaleria(params: {
  formato?: string;
  serie?: string;
  disponibles?: string;
  page?: string;
}): FiltrosGaleria {
  const pagina = Number(params.page);

  return {
    formato: esFormato(params.formato) ? params.formato : null,
    serie: params.serie?.trim() || null,
    soloDisponibles: params.disponibles === "si",
    pagina: Number.isInteger(pagina) && pagina > 0 ? pagina : 1,
  };
}

export function hayFiltros(filtros: FiltrosGaleria): boolean {
  return (
    filtros.formato !== null || filtros.serie !== null || filtros.soloDisponibles
  );
}

/**
 * Condiciones que se suman al filtro de visibilidad del sitio. No lo
 * reemplazan: lo que está oculto sigue oculto haga lo que haga el visitante
 * con la URL.
 */
export function galeriaWhere(filtros: FiltrosGaleria, serieId: string | null) {
  return {
    ...(filtros.formato ? formatoWhere(filtros.formato) : {}),
    ...(serieId ? { seriesId: serieId } : {}),
    ...(filtros.soloDisponibles ? { status: "AVAILABLE" as const } : {}),
  };
}

/**
 * URL de la galería conservando los filtros; omite todo lo que sea el valor
 * por defecto. El idioma decide el prefijo: en español, ninguno.
 */
export function galeriaHref(
  filtros: FiltrosGaleria,
  cambios: Partial<FiltrosGaleria> = {},
  idioma: Idioma = "es",
): string {
  const combinados = { ...filtros, ...cambios };
  const params = new URLSearchParams();

  if (combinados.formato) params.set("formato", combinados.formato);
  if (combinados.serie) params.set("serie", combinados.serie);
  if (combinados.soloDisponibles) params.set("disponibles", "si");
  if (combinados.pagina > 1) params.set("page", String(combinados.pagina));

  const base = ruta(idioma, "/galeria");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
