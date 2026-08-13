import { z } from "zod";

/**
 * Horquilla orientativa de precio de un encargo por tamaño.
 *
 * Sirve para filtrar sin ofender: quien busca un óleo por cincuenta euros lo
 * ve antes de escribir, y quien está dispuesto a pagarlo escribe con más
 * confianza. Los números son un punto de partida razonable para obra de
 * pequeño formato; se ajustan en `lib/commissions.ts` y en ningún sitio más.
 */
const HORQUILLAS: { hastaCm: number; desde: number; hasta: number }[] = [
  { hastaCm: 40, desde: 25000, hasta: 45000 },
  { hastaCm: 70, desde: 45000, hasta: 90000 },
  { hastaCm: 110, desde: 90000, hasta: 180000 },
];

export type Horquilla = { desdeCentimos: number; hastaCentimos: number } | null;

/**
 * `null` cuando la obra se sale de la tabla: por encima de cierto tamaño el
 * precio depende demasiado del encargo concreto para dar una cifra.
 */
export function horquillaEncargo(anchoCm: number, altoCm: number): Horquilla {
  if (anchoCm <= 0 || altoCm <= 0) return null;

  const ladoMayor = Math.max(anchoCm, altoCm);
  const tramo = HORQUILLAS.find((escalon) => ladoMayor <= escalon.hastaCm);

  return tramo
    ? { desdeCentimos: tramo.desde, hastaCentimos: tramo.hasta }
    : null;
}

export const commissionSchema = z.object({
  name: z.string().trim().min(1, "Indica tu nombre").max(120),
  email: z.string().email("Correo no válido"),
  brief: z
    .string()
    .trim()
    .min(20, "Cuéntame un poco más: qué te gustaría y por qué")
    .max(4000),
  widthCm: z
    .union([z.literal(""), z.coerce.number().int().positive().max(400)])
    .optional()
    .transform((valor) => (valor === "" || valor === undefined ? null : valor)),
  heightCm: z
    .union([z.literal(""), z.coerce.number().int().positive().max(400)])
    .optional()
    .transform((valor) => (valor === "" || valor === undefined ? null : valor)),
  deadline: z.string().trim().max(200).optional().default(""),
  // Campo trampa, igual que en las consultas.
  website: z.string().max(0, "Envío rechazado").optional().default(""),
});
