import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: ["{app,lib,components}/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    // Los tests de componentes declaran su entorno con
    // `// @vitest-environment jsdom` en la cabecera del fichero.
    coverage: {
      provider: "v8",
      include: ["lib/**", "app/api/**"],
      // El umbral mide la lógica que se puede probar aislada. Lo que queda
      // fuera no está sin probar: se verifica en la suite E2E, contra Postgres
      // y ficheros de verdad, que es donde esas piezas significan algo.
      exclude: [
        "lib/generated/**", // cliente que genera Prisma, no es código nuestro
        "lib/db.ts", // instancia el cliente y nada más
        "lib/admin/actions.ts", // Server Actions → e2e/admin/
        "lib/admin/series-actions.ts", // Server Actions → e2e/admin/series.spec.ts
        "lib/public/actions.ts", // Server Actions → e2e/public/inquiry.spec.ts
        "lib/auth/guard.ts", // un redirect → e2e/admin/login.spec.ts
        "app/api/admin/**", // → e2e/admin/login-api.spec.ts
        "app/api/uploads/**", // servir ficheros → e2e/public/painting.spec.ts
      ],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
