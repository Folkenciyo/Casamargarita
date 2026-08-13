import { expect, test as setup } from "@playwright/test";
import { ADMIN_STORAGE_STATE, TEST_ADMIN } from "./fixtures/test-data";

/**
 * Entra una sola vez por el formulario real y guarda la cookie de sesión. Los
 * tests del panel arrancan ya dentro, sin repetir el login (y sin gastar
 * intentos del limitador).
 */
setup("guarda la sesión de administración", async ({ page }) => {
  // Primera visita al panel de toda la suite: `next dev` compila aquí el
  // dashboard entero y eso puede llevar bastante más que un test normal.
  setup.setTimeout(180_000);

  await page.goto("/admin/login");

  await page.getByLabel("Correo").fill(TEST_ADMIN.email);
  await page.getByLabel("Contraseña").fill(TEST_ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/admin$/, { timeout: 120_000 });
  await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible({
    timeout: 120_000,
  });

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
