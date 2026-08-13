import { expect, test } from "@playwright/test";
import { seeded, TEST_IPS } from "../fixtures/test-data";

test.use({ extraHTTPHeaders: { "x-forwarded-for": TEST_IPS.adminInquiries } });

const painting = seeded("amanecer-en-el-estudio");
const SENDER = "Lucía Interesada";
const MESSAGE = "¿Podría verla en persona antes de decidirme?";

test("una consulta enviada desde la web aparece en el panel y se marca leída", async ({
  page,
}) => {
  await test.step("enviar la consulta desde la ficha de la obra", async () => {
    await page.goto(`/obra/${painting.slug}`);

    await page.getByLabel("Nombre").fill(SENDER);
    await page.getByLabel("Correo").fill("lucia@example.com");
    await page.getByLabel("Mensaje").fill(MESSAGE);
    await page.getByRole("button", { name: "Enviar consulta" }).click();

    await expect(page.getByRole("status")).toContainText("Consulta enviada");
  });

  await page.goto("/admin/consultas");

  // Contador relativo: otros tests pueden haber dejado consultas antes.
  const resumen = page.getByText(/sin leer · .* sin contestar/);
  await expect(resumen).toBeVisible();
  const unread = Number(/(\d+) sin leer/.exec(await resumen.innerText())![1]);
  expect(unread).toBeGreaterThan(0);

  // El aviso de la nav es visible desde cualquier vista, no solo aquí.
  const navBadge = page.locator('nav a[href="/admin/consultas"] span');
  await expect(navBadge).toHaveText(String(unread));

  const entry = page.locator("li").filter({ hasText: SENDER });
  await expect(entry).toContainText("lucia@example.com");
  await expect(entry).toContainText(MESSAGE);
  // Queda registrada la obra por la que se pregunta.
  await expect(entry.getByRole("link", { name: painting.title })).toHaveAttribute(
    "href",
    `/obra/${painting.slug}`,
  );

  await entry.getByRole("button", { name: "Marcar como leída" }).click();

  await expect(resumen).toContainText(`${unread - 1} sin leer`);
  await expect(
    entry.getByRole("button", { name: "Marcar como leída" }),
  ).toHaveCount(0);

  if (unread - 1 > 0) {
    await expect(navBadge).toHaveText(String(unread - 1));
  } else {
    await expect(navBadge).toHaveCount(0);
  }

  await test.step("marcarla como contestada y anotar algo", async () => {
    await entry.getByRole("button", { name: "Marcar como contestada" }).click();
    await expect(entry).toContainText("contestada");

    await entry.getByRole("button", { name: "Añadir una nota" }).click();
    await entry.getByLabel("Nota privada").fill("Quedamos el jueves en el taller.");
    await entry.getByRole("button", { name: "Guardar nota" }).click();
    // Se espera al acuse antes de recargar: recargar a media acción la
    // cancelaría y la nota no llegaría a guardarse.
    await expect(entry.getByText("Nota guardada")).toBeVisible();

    // La nota sobrevive a recargar: está guardada, no solo en pantalla.
    await page.reload();
    const guardada = page.locator("li").filter({ hasText: SENDER });
    await expect(guardada.getByLabel("Nota privada")).toHaveValue(
      "Quedamos el jueves en el taller.",
    );
  });

  await test.step("la nota privada no sale nunca a la web", async () => {
    await page.goto(`/obra/${painting.slug}`);
    await expect(page.getByText("Quedamos el jueves")).toHaveCount(0);
    await expect(page.getByText(SENDER)).toHaveCount(0);
  });
});
