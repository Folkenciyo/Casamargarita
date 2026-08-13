/**
 * Presupuesto orientativo de embalaje y envío.
 *
 * Existe para ahorrar los tres correos que hoy se come cada venta: quien
 * pregunta ya sabe el orden de magnitud antes de escribir. **No es un precio
 * cerrado** y así se dice en pantalla: el transporte de obra enmarcada o de
 * gran formato se cotiza aparte.
 *
 * Las tarifas son de bulto, no de peso: un óleo pesa poco y ocupa mucho, así
 * que lo que manda es el lado mayor.
 */
export const ZONAS = ["peninsula", "baleares", "canarias", "europa", "resto"] as const;
export type Zona = (typeof ZONAS)[number];

export const ZONA_ETIQUETAS: Record<Zona, string> = {
  peninsula: "España peninsular",
  baleares: "Baleares",
  canarias: "Canarias, Ceuta y Melilla",
  europa: "Unión Europea",
  resto: "Resto del mundo",
};

/** Escalones por lado mayor de la obra, en centímetros. */
const ESCALONES = [
  { hastaCm: 50, nombre: "pequeño" },
  { hastaCm: 100, nombre: "mediano" },
  { hastaCm: 160, nombre: "grande" },
] as const;

/**
 * Precios en céntimos: embalaje rígido incluido. El escalón `null` es lo que
 * pasa de 160 cm, que ya no va por mensajería normal.
 */
const TARIFAS: Record<Zona, [number, number, number]> = {
  peninsula: [2500, 4500, 9000],
  baleares: [4500, 7500, 14000],
  canarias: [6500, 11000, 20000],
  europa: [6000, 10000, 18000],
  resto: [12000, 20000, 35000],
};

export type Presupuesto =
  | { tipo: "tarifa"; centimos: number; escalon: string }
  | { tipo: "a-consultar"; motivo: string };

export function presupuestoEnvio({
  anchoCm,
  altoCm,
  zona,
}: {
  anchoCm: number;
  altoCm: number;
  zona: Zona;
}): Presupuesto {
  if (anchoCm <= 0 || altoCm <= 0) {
    throw new RangeError("Las medidas deben ser positivas");
  }

  // El embalaje añade unos centímetros por lado: una obra de 98 cm no viaja
  // en una caja de 98 cm.
  const ladoMayor = Math.max(anchoCm, altoCm) + 10;
  const indice = ESCALONES.findIndex((escalon) => ladoMayor <= escalon.hastaCm);

  if (indice === -1) {
    return {
      tipo: "a-consultar",
      motivo: "Por encima de 150 cm el envío va por transporte especial.",
    };
  }

  return {
    tipo: "tarifa",
    centimos: TARIFAS[zona][indice] as number,
    escalon: ESCALONES[indice]!.nombre,
  };
}

export function esZona(valor: unknown): valor is Zona {
  return ZONAS.some((zona) => zona === valor);
}
