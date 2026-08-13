/**
 * Interfaz en dos idiomas.
 *
 * El español vive en las rutas de siempre (`/galeria`) y el inglés cuelga de
 * `/en` (`/en/galeria`). No se ha metido el idioma en todas las direcciones
 * (`/es/galeria`) a propósito: obligaría a redirigir cuanto ya está indexado
 * y a reescribir enlaces por todo el sitio, a cambio de nada para quien lee
 * en español, que es la mayoría.
 *
 * Lo que se traduce es la **interfaz**. Los textos de la artista —biografía,
 * descripciones de obra, diario— siguen en el idioma en que los escribió:
 * traducir prosa automáticamente se nota, y en una web de autor se nota más.
 */
export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

export type Diccionario = {
  htmlLang: string;
  nav: {
    galeria: string;
    diario: string;
    artista: string;
    buscar: string;
    verLaWeb: string;
  };
  portada: {
    verGaleria: string;
    obraDestacada: string;
    lema: string;
  };
  galeria: {
    titulo: string;
    verComoSala: string;
    modoExposicion: string;
    tamano: string;
    cualquiera: string;
    serie: string;
    todas: string;
    soloDisponibles: string;
    quitarFiltros: string;
    obra: string;
    obras: string;
    sinObra: string;
    sinCoincidencias: string;
    verCatalogoCompleto: string;
    anterior: string;
    siguiente: string;
    pagina: string;
    de: string;
  };
  obra: {
    tecnica: string;
    medidas: string;
    ano: string;
    estado: string;
    precio: string;
    interesa: string;
    verLaPincelada: string;
    aTamanoReal: string;
    unaPersona: string;
    unSofa: string;
    unaPuerta: string;
    escalaPie: (medidas: string, referencia: string, alto: number) => string;
  };
  formulario: {
    nombre: string;
    correo: string;
    mensaje: string;
    enviar: string;
    enviando: string;
    enviada: string;
  };
  formatos: {
    pequeno: string;
    mediano: string;
    grande: string;
  };
  estados: {
    AVAILABLE: string;
    RESERVED: string;
    SOLD: string;
    NOT_FOR_SALE: string;
  };
  precioAConsultar: string;
};

const es: Diccionario = {
  htmlLang: "es",
  nav: {
    galeria: "Galería",
    diario: "Diario",
    artista: "La artista",
    buscar: "Buscar",
    verLaWeb: "Ver la web",
  },
  portada: {
    verGaleria: "Ver la galería",
    obraDestacada: "Obra destacada",
    lema: "Óleo sobre lienzo.",
  },
  galeria: {
    titulo: "Galería",
    verComoSala: "Verla como sala",
    modoExposicion: "Modo exposición",
    tamano: "Tamaño",
    cualquiera: "Cualquiera",
    serie: "Serie",
    todas: "Todas",
    soloDisponibles: "Solo disponibles",
    quitarFiltros: "Quitar filtros",
    obra: "obra",
    obras: "obras",
    sinObra: "Todavía no hay obra publicada.",
    sinCoincidencias: "Ninguna obra encaja con esta combinación.",
    verCatalogoCompleto: "Ver el catálogo completo",
    anterior: "Anterior",
    siguiente: "Siguiente",
    pagina: "Página",
    de: "de",
  },
  obra: {
    tecnica: "Técnica",
    medidas: "Medidas",
    ano: "Año",
    estado: "Estado",
    precio: "Precio",
    interesa: "¿Te interesa esta obra?",
    verLaPincelada: "Ver la pincelada",
    aTamanoReal: "A tamaño real",
    unaPersona: "Una persona",
    unSofa: "Un sofá",
    unaPuerta: "Una puerta",
    escalaPie: (medidas, referencia, alto) =>
      `${medidas}, colgada con el centro a 150 cm del suelo —la altura de museo— junto a ${referencia.toLowerCase()} de ${alto} cm.`,
  },
  formulario: {
    nombre: "Nombre",
    correo: "Correo",
    mensaje: "Mensaje",
    enviar: "Enviar consulta",
    enviando: "Enviando…",
    enviada: "Consulta enviada",
  },
  formatos: {
    pequeno: "Pequeño formato",
    mediano: "Formato medio",
    grande: "Gran formato",
  },
  estados: {
    AVAILABLE: "Disponible",
    RESERVED: "Reservado",
    SOLD: "Vendido",
    NOT_FOR_SALE: "No está a la venta",
  },
  precioAConsultar: "Precio a consultar",
};

const en: Diccionario = {
  htmlLang: "en",
  nav: {
    galeria: "Gallery",
    diario: "Studio journal",
    artista: "The artist",
    buscar: "Search",
    verLaWeb: "View site",
  },
  portada: {
    verGaleria: "See the gallery",
    obraDestacada: "Selected work",
    lema: "Oil on canvas.",
  },
  galeria: {
    titulo: "Gallery",
    verComoSala: "View as a room",
    modoExposicion: "Exhibition mode",
    tamano: "Size",
    cualquiera: "Any",
    serie: "Series",
    todas: "All",
    soloDisponibles: "Available only",
    quitarFiltros: "Clear filters",
    obra: "work",
    obras: "works",
    sinObra: "No work published yet.",
    sinCoincidencias: "No work matches this combination.",
    verCatalogoCompleto: "See the full catalogue",
    anterior: "Previous",
    siguiente: "Next",
    pagina: "Page",
    de: "of",
  },
  obra: {
    tecnica: "Medium",
    medidas: "Size",
    ano: "Year",
    estado: "Status",
    precio: "Price",
    interesa: "Interested in this work?",
    verLaPincelada: "See the brushwork",
    aTamanoReal: "Actual size",
    unaPersona: "A person",
    unSofa: "A sofa",
    unaPuerta: "A door",
    escalaPie: (medidas, referencia, alto) =>
      `${medidas}, hung with its centre 150 cm from the floor —museum height— next to ${referencia.toLowerCase()} of ${alto} cm.`,
  },
  formulario: {
    nombre: "Name",
    correo: "Email",
    mensaje: "Message",
    enviar: "Send enquiry",
    enviando: "Sending…",
    enviada: "Enquiry sent",
  },
  formatos: {
    pequeno: "Small format",
    mediano: "Medium format",
    grande: "Large format",
  },
  estados: {
    AVAILABLE: "Available",
    RESERVED: "Reserved",
    SOLD: "Sold",
    NOT_FOR_SALE: "Not for sale",
  },
  precioAConsultar: "Price on request",
};

const DICCIONARIOS: Record<Idioma, Diccionario> = { es, en };

export function diccionario(idioma: Idioma): Diccionario {
  return DICCIONARIOS[idioma];
}

export function esIdioma(valor: unknown): valor is Idioma {
  return IDIOMAS.some((idioma) => idioma === valor);
}

/**
 * Prefijo de las URLs de un idioma. El español no lleva prefijo: sus
 * direcciones son las de siempre.
 */
export function prefijo(idioma: Idioma): string {
  return idioma === IDIOMA_POR_DEFECTO ? "" : `/${idioma}`;
}

/** Traduce una ruta interna al idioma dado. */
export function ruta(idioma: Idioma, camino: string): string {
  const limpio = camino.startsWith("/") ? camino : `/${camino}`;
  return `${prefijo(idioma)}${limpio}` || "/";
}
