import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
const logError = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("@/lib/log", () => ({ log: { error: logError } }));

const { GET } = await import("./route");

beforeEach(() => {
  queryRaw.mockReset();
  logError.mockReset();
});

describe("GET /api/ready", () => {
  it("responde 200 cuando la base de datos contesta", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      db: "up",
    });
  });

  // 503 y no 500: el contenedor sigue vivo y sirviendo, es la base de datos la
  // que no está. El HEALTHCHECK mira /api/health, no esta ruta.
  it("responde 503 cuando la base de datos no contesta", async () => {
    queryRaw.mockRejectedValue(new Error("connection refused"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "degraded",
      db: "down",
    });
  });

  it("deja constancia del fallo en el log del servidor", async () => {
    const error = new Error("connection refused");
    queryRaw.mockRejectedValue(error);

    await GET();

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("readiness"),
      error,
    );
  });
});
