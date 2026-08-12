import { defineConfig, devices } from "@playwright/test";
import {
  ADMIN_STORAGE_STATE,
  E2E_BASE_URL,
  E2E_DATABASE_URL,
  E2E_PORT,
  E2E_SESSION_SECRET,
  E2E_UPLOADS_DIR,
  TEST_ADMIN,
} from "./e2e/fixtures/test-data";

/**
 * Suite E2E. Siempre en contenedor:
 *   docker compose -f docker-compose.test.yml run --rm e2e
 *
 * El servidor lo arranca Playwright dentro del propio contenedor (`next dev`
 * en el puerto 3100), así que la base de datos, el directorio de subidas y el
 * hash de la contraseña son los del entorno de test y de nadie más.
 */
export default defineConfig({
  testDir: "./e2e",

  // La base de datos y el limitador de intentos (en memoria del servidor) son
  // estado compartido: en paralelo los tests se pisarían entre ellos.
  workers: 1,
  fullyParallel: false,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,

  // `next dev` compila cada ruta la primera vez que se visita, y el panel
  // arrastra bastante JavaScript de cliente: la primera visita a cada vista se
  // mide en segundos, no en milisegundos.
  timeout: 90_000,
  expect: { timeout: 30_000 },

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: E2E_BASE_URL,
    // La traza ya lleva capturas de cada paso; grabar vídeo además obligaría a
    // instalar ffmpeg en la imagen para nada.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Con movimiento reducido la capa de óleo no se monta: los enlaces navegan
    // al instante en lugar de esperar el brochazo. Los fallbacks de la capa
    // WebGL tienen su propio test. Desde Playwright 1.62 esta opción va dentro
    // de contextOptions, ya no al nivel de `use`.
    contextOptions: { reducedMotion: "reduce" },
  },

  projects: [
    {
      name: "seed",
      testMatch: /seed\.setup\.ts$/,
    },
    {
      name: "auth",
      testMatch: /auth\.setup\.ts$/,
      dependencies: ["seed"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "public",
      testMatch: /public\/.*\.spec\.ts$/,
      dependencies: ["seed"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testMatch: /admin\/.*\.spec\.ts$/,
      dependencies: ["auth"],
      use: { ...devices["Desktop Chrome"], storageState: ADMIN_STORAGE_STATE },
    },
  ],

  webServer: {
    command: `pnpm exec next dev --port ${E2E_PORT} --hostname 127.0.0.1`,
    url: `${E2E_BASE_URL}/api/health`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // El proceso de Playwright corre con NODE_ENV=test; `next dev` quiere
      // development, si no avisa de un NODE_ENV no estándar en cada arranque.
      NODE_ENV: "development",
      DATABASE_URL: E2E_DATABASE_URL,
      UPLOADS_DIR: E2E_UPLOADS_DIR,
      SESSION_SECRET: E2E_SESSION_SECRET,
      ADMIN_EMAIL: TEST_ADMIN.email,
      ADMIN_PASSWORD_HASH: TEST_ADMIN.passwordHash,
      PUBLIC_URL: E2E_BASE_URL,
    },
  },
});
