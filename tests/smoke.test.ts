import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("healthcheck", () => {
  it("responde ok", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: "ok" });
  });
});
