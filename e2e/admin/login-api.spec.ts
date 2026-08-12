import { expect, test } from "@playwright/test";
import { TEST_ADMIN, TEST_IPS } from "../fixtures/test-data";

test.use({ storageState: { cookies: [], origins: [] } });

const WRONG = { email: TEST_ADMIN.email, password: "contraseña-equivocada" };

test("sin cabecera Origin la petición se rechaza por origen", async ({
  request,
}) => {
  const response = await request.post("/api/admin/login", {
    headers: { "x-forwarded-for": TEST_IPS.adminLoginApiOrigin },
    data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
  });

  expect(response.status()).toBe(403);
  expect(await response.json()).toMatchObject({ error: "Origen no permitido" });
});

test("un origen ajeno tampoco pasa", async ({ request }) => {
  const response = await request.post("/api/admin/login", {
    headers: {
      origin: "https://otro-sitio.example",
      "x-forwarded-for": TEST_IPS.adminLoginApiOrigin,
    },
    data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
  });

  expect(response.status()).toBe(403);
});

test("las credenciales incorrectas devuelven un 401 genérico", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/admin/login", {
    headers: {
      origin: baseURL!,
      "x-forwarded-for": TEST_IPS.adminLoginApiWrong,
    },
    data: WRONG,
  });

  expect(response.status()).toBe(401);
  // Mismo mensaje que con un correo inexistente: no se filtra qué ha fallado.
  expect(await response.json()).toMatchObject({
    error: "Credenciales incorrectas",
  });

  const unknownUser = await request.post("/api/admin/login", {
    headers: {
      origin: baseURL!,
      "x-forwarded-for": TEST_IPS.adminLoginApiWrong,
    },
    data: { email: "nadie@example.com", password: TEST_ADMIN.password },
  });

  expect(unknownUser.status()).toBe(401);
  expect(await unknownUser.json()).toMatchObject({
    error: "Credenciales incorrectas",
  });
});

test("el limitador corta al sexto intento desde la misma IP", async ({
  request,
  baseURL,
}) => {
  const headers = {
    origin: baseURL!,
    "x-forwarded-for": TEST_IPS.adminLoginApiLimit,
  };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await request.post("/api/admin/login", {
      headers,
      data: WRONG,
    });
    expect(response.status(), `intento ${attempt}`).toBe(401);
  }

  const blocked = await request.post("/api/admin/login", { headers, data: WRONG });
  expect(blocked.status()).toBe(429);
  expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);

  // Ni con la contraseña correcta: el corte es por IP, no por credenciales.
  const evenWithGoodPassword = await request.post("/api/admin/login", {
    headers,
    data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
  });
  expect(evenWithGoodPassword.status()).toBe(429);
});
