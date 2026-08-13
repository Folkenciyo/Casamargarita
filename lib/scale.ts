/**
 * Referencias para hacerse una idea del tamaño real de una obra.
 *
 * Las medidas son las habituales de mobiliario y de estatura media adulta en
 * España. No pretenden ser exactas: pretenden dar escala, que es distinto.
 */
export type Referencia = {
  id: string;
  nombre: string;
  /** Altura en centímetros de la referencia completa. */
  altoCm: number;
  anchoCm: number;
};

/** La de partida: la estatura media adulta es la vara de medir de todos. */
export const PERSONA: Referencia = {
  id: "persona",
  nombre: "Una persona",
  altoCm: 170,
  anchoCm: 45,
};

export const REFERENCIAS: readonly Referencia[] = [
  PERSONA,
  { id: "sofa", nombre: "Un sofá", altoCm: 85, anchoCm: 200 },
  { id: "puerta", nombre: "Una puerta", altoCm: 203, anchoCm: 72.5 },
];

export function referenciaPorId(id: string): Referencia {
  return REFERENCIAS.find((referencia) => referencia.id === id) ?? PERSONA;
}

/**
 * Reparte el espacio disponible entre la obra y su referencia manteniendo la
 * proporción real entre ambas.
 *
 * Devuelve porcentajes sobre la altura total del escenario, que es lo que
 * consume el componente: así el dibujo se adapta al ancho que tenga sin
 * recalcular nada.
 */
export function proporciones({
  obraAnchoCm,
  obraAltoCm,
  referencia,
}: {
  obraAnchoCm: number;
  obraAltoCm: number;
  referencia: Referencia;
}): {
  obraAltoPct: number;
  obraAnchoPct: number;
  referenciaAltoPct: number;
  referenciaAnchoPct: number;
  masAltoCm: number;
} {
  if (obraAnchoCm <= 0 || obraAltoCm <= 0) {
    throw new RangeError("Las medidas de la obra deben ser positivas");
  }

  // La obra se cuelga con su centro a la altura de los ojos, así que su borde
  // superior puede quedar por encima de la referencia: el escenario tiene que
  // dar cabida a lo más alto de los dos.
  const bordeSuperiorObra = ALTURA_OJOS_CM + obraAltoCm / 2;
  const masAltoCm = Math.max(bordeSuperiorObra, referencia.altoCm);

  const aEscala = (cm: number) => (cm / masAltoCm) * 100;

  return {
    obraAltoPct: aEscala(obraAltoCm),
    obraAnchoPct: aEscala(obraAnchoCm),
    referenciaAltoPct: aEscala(referencia.altoCm),
    referenciaAnchoPct: aEscala(referencia.anchoCm),
    masAltoCm,
  };
}

/** Altura de colgado de museo, medida al centro del cuadro. */
export const ALTURA_OJOS_CM = 150;

/**
 * A qué altura queda el borde inferior de la obra. Puede ser negativa en un
 * cuadro enorme —el borde bajaría del suelo—, y en ese caso se apoya en él.
 */
export function bordeInferiorCm(obraAltoCm: number): number {
  return Math.max(0, ALTURA_OJOS_CM - obraAltoCm / 2);
}
