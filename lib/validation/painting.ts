import { z } from "zod";

export const PAINTING_STATUSES = [
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "NOT_FOR_SALE",
] as const;

export const STATUS_LABELS: Record<(typeof PAINTING_STATUSES)[number], string> =
  {
    AVAILABLE: "Disponible",
    RESERVED: "Reservado",
    SOLD: "Vendido",
    NOT_FOR_SALE: "No está a la venta",
  };

/** Precio escrito por la artista en euros ("1200", "1.200", "1200,50") → céntimos. */
const priceField = z
  .string()
  .trim()
  .transform((raw) => {
    if (raw === "") return null;
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    const euros = Number(normalized);
    if (!Number.isFinite(euros) || euros < 0) return Number.NaN;
    return Math.round(euros * 100);
  })
  .refine((cents) => cents === null || !Number.isNaN(cents), {
    message: "Precio no válido",
  });

const intField = (label: string, max: number) =>
  z.coerce
    .number({ message: `${label} debe ser un número` })
    .int(`${label} debe ser un número entero`)
    .positive(`${label} debe ser mayor que cero`)
    .max(max, `${label} fuera de rango`);

export const paintingSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(160),
  description: z.string().trim().max(4000).optional().default(""),
  technique: z.string().trim().min(1).max(120).default("Óleo sobre lienzo"),
  // El formulario puede no enviar el campo (undefined) o enviarlo vacío.
  year: z
    .union([z.literal(""), z.coerce.number().int().min(1900).max(2100)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  widthCm: intField("El ancho", 1000),
  heightCm: intField("El alto", 1000),
  priceCents: priceField,
  status: z.enum(PAINTING_STATUSES).default("AVAILABLE"),
  published: z.coerce.boolean().default(true),
  featured: z.coerce.boolean().default(false),
});

export type PaintingInput = z.infer<typeof paintingSchema>;

export const artistSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(160),
  statement: z.string().trim().max(400).default(""),
  bio: z.string().trim().max(8000).default(""),
  email: z.union([z.literal(""), z.string().email()]).default(""),
  instagram: z.string().trim().max(120).default(""),
});

export const inquirySchema = z.object({
  name: z.string().trim().min(1, "Indica tu nombre").max(120),
  email: z.string().email("Correo no válido"),
  message: z.string().trim().min(10, "Cuéntame algo más").max(2000),
  paintingId: z.string().trim().optional(),
  // Campo trampa: los bots lo rellenan, las personas no lo ven.
  website: z.string().max(0, "Envío rechazado").optional().default(""),
});
