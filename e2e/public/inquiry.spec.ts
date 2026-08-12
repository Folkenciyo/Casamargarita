import { expect, test } from "@playwright/test";
import { seeded, TEST_IPS } from "../fixtures/test-data";

// IP propia: el formulario comparte limitador con el login (5 envíos por IP
// cada 15 minutos) y así este fichero no gasta los intentos de nadie más.
test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.publicInquiry } });

const painting = seeded("amanecer-en-el-estudio");

test("una consulta válida se acepta y lo dice", async ({ page }) => {
  await page.goto(`/obra/${painting.slug}`);

  await page.getByLabel("Nombre").fill("Marta Compradora");
  await page.getByLabel("Correo").fill("marta@example.com");
  await page
    .getByLabel("Mensaje")
    .fill("Me interesa esta obra, ¿sigue disponible?");
  await page.getByRole("button", { name: "Enviar consulta" }).click();

  await expect(page.getByRole("status")).toContainText("Consulta enviada");
  // El formulario desaparece: no se envía dos veces por accidente.
  await expect(
    page.getByRole("button", { name: "Enviar consulta" }),
  ).toHaveCount(0);
});

test("el campo trampa rechaza el envío de un bot", async ({ page }) => {
  await page.goto(`/obra/${painting.slug}`);

  await page.getByLabel("Nombre").fill("Bot Rellenatodo");
  await page.getByLabel("Correo").fill("bot@example.com");
  await page.getByLabel("Mensaje").fill("Mensaje automático de relleno");
  // Un bot rellena el campo oculto; una persona no lo ve siquiera.
  await page.locator('input[name="website"]').fill("https://spam.example");
  await page.getByRole("button", { name: "Enviar consulta" }).click();

  // `p[role=alert]` y no getByRole: Next añade su propio anunciador de rutas
  // con role="alert" y vacío, y el selector por rol recogería los dos.
  await expect(page.locator('p[role="alert"]')).toContainText("Envío rechazado");
});
