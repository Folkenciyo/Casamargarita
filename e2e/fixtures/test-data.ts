/**
 * Datos de referencia de la suite E2E. Los siembra `seed.setup.ts` antes de
 * cualquier test y los tests los dan por ciertos: nadie los modifica salvo
 * para dejarlos como estaban.
 */

export const ADMIN_STORAGE_STATE = "e2e/.auth/admin.json";

/** Puerto propio: no choca con el `docker compose up` de desarrollo. */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export const E2E_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://art:art@postgres-test:5432/casamargarita_test?schema=public";

export const E2E_UPLOADS_DIR = process.env.UPLOADS_DIR ?? "/tmp/uploads";

export const E2E_SESSION_SECRET =
  process.env.SESSION_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-32";

/**
 * Credenciales de test. El hash es de la contraseña de abajo y solo vale para
 * esta suite: `docker-compose.test.yml` puede sobrescribirlo con
 * `TEST_ADMIN_PASSWORD_HASH`, y sin él la suite sigue arrancando sola.
 */
export const TEST_ADMIN = {
  email: process.env.ADMIN_EMAIL || "test@example.com",
  password: "test-password",
  passwordHash:
    process.env.ADMIN_PASSWORD_HASH ||
    "$argon2id$v=19$m=19456,t=2,p=1$Wu51Hys4GvLKLdANY4rA8g$MLIstbGHWvZndw615fujwYYlMCH6TofHHjtCv32HQUA",
} as const;

export const SEEDED_ARTIST = {
  name: "Casa Margarita",
  statement: "Óleo sobre lienzo. Prueba de extremo a extremo.",
  bio: "Biografía de referencia para los tests.",
  email: "hola@casamargarita.example",
  instagram: "@casamargarita",
} as const;

export type SeededPainting = {
  slug: string;
  title: string;
  description: string;
  year: number | null;
  widthCm: number;
  heightCm: number;
  priceCents: number | null;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "NOT_FOR_SALE";
  published: boolean;
  featured: boolean;
  position: number;
  /** Si lleva foto, el sembrado la genera y la pasa por el pipeline real. */
  withImage: boolean;
};

export const SEEDED_PAINTINGS: readonly SeededPainting[] = [
  {
    slug: "amanecer-en-el-estudio",
    title: "Amanecer en el estudio",
    description: "Luz de primera hora entrando por el ventanal del taller.",
    year: 2024,
    widthCm: 100,
    heightCm: 81,
    priceCents: 120000,
    status: "AVAILABLE",
    published: true,
    featured: true,
    position: 0,
    withImage: true,
  },
  {
    slug: "bodegon-vendido",
    title: "Bodegón vendido",
    description: "Cobre y limones sobre paño oscuro.",
    year: 2023,
    widthCm: 60,
    heightCm: 50,
    priceCents: 90000,
    status: "SOLD",
    published: true,
    featured: true,
    position: 1,
    withImage: true,
  },
  {
    slug: "retrato-a-consultar",
    title: "Retrato a consultar",
    description: "Retrato de estudio en capas finas.",
    year: null,
    widthCm: 65,
    heightCm: 54,
    priceCents: null,
    status: "AVAILABLE",
    published: true,
    featured: false,
    position: 2,
    withImage: false,
  },
  {
    slug: "borrador-oculto",
    title: "Borrador oculto",
    description: "Sin terminar: no debe salir en la web.",
    year: null,
    widthCm: 40,
    heightCm: 40,
    priceCents: 50000,
    status: "AVAILABLE",
    published: false,
    featured: false,
    position: 3,
    withImage: false,
  },
];

export function seeded(slug: string): SeededPainting {
  const painting = SEEDED_PAINTINGS.find((item) => item.slug === slug);
  if (!painting) throw new Error(`No hay obra sembrada con slug "${slug}"`);
  return painting;
}

/**
 * Cada fichero de test usa su propia IP simulada: el limitador de intentos
 * guarda un contador por IP, así un test no gasta los intentos de otro.
 */
export const TEST_IPS = {
  publicPages: "203.0.113.10",
  publicInquiry: "203.0.113.11",
  publicRoom: "203.0.113.12",
  publicSecurity: "203.0.113.13",
  publicI18n: "203.0.113.14",
  adminLoginUi: "203.0.113.20",
  adminLoginApiOrigin: "203.0.113.30",
  adminLoginApiWrong: "203.0.113.31",
  adminLoginApiLimit: "203.0.113.32",
  adminDashboard: "203.0.113.39",
  adminPaintings: "203.0.113.40",
  adminArtist: "203.0.113.41",
  adminInquiries: "203.0.113.42",
  adminSeries: "203.0.113.43",
  adminTrash: "203.0.113.44",
  adminUploadSize: "203.0.113.45",
  adminDetails: "203.0.113.46",
} as const;
