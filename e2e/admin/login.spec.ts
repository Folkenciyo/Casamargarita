import { expect, test } from "@playwright/test";
import { TEST_ADMIN, TEST_IPS } from "../fixtures/test-data";

// Sin sesión guardada: estos tests son precisamente sobre entrar y salir.
test.use({
  storageState: { cookies: [], origins: [] },
  extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminLoginUi },
});

test("el panel exige sesión y recuerda a dónde ibas", async ({ page }) => {
  await page.goto("/admin/consultas");

  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fconsultas$/);
  await expect(page.getByRole("heading", { name: "Acceso" })).toBeVisible();
});

test("unas credenciales incorrectas no dejan entrar", async ({ page }) => {
  await page.goto("/admin/login");

  await page.getByLabel("Correo").fill(TEST_ADMIN.email);
  await page.getByLabel("Contraseña").fill("contraseña-equivocada");
  await page.getByRole("button", { name: "Entrar" }).click();

  // `p[role=alert]` y no getByRole: el anunciador de rutas de Next también
  // lleva role="alert" y está vacío.
  await expect(page.locator('p[role="alert"]')).toContainText(
    "Credenciales incorrectas",
  );
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("con las credenciales correctas se entra y se puede salir", async ({
  page,
}) => {
  await page.goto("/admin/login");

  await page.getByLabel("Correo").fill(TEST_ADMIN.email);
  await page.getByLabel("Contraseña").fill(TEST_ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: /^Obras \(/ })).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);

  // Y la sesión queda cerrada de verdad.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin$/);
});
