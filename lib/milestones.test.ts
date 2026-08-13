import { describe, expect, it } from "vitest";
import {
  MILESTONE_KINDS,
  MILESTONE_LABELS,
  MILESTONE_ORDER,
  agruparPorTipo,
  esMilestoneKind,
} from "./milestones";

describe("esMilestoneKind", () => {
  it("acepta los tipos conocidos", () => {
    expect(esMilestoneKind("EXHIBITION")).toBe(true);
    expect(esMilestoneKind("PRESS")).toBe(true);
  });

  it("rechaza cualquier otra cosa", () => {
    expect(esMilestoneKind("PREMIO")).toBe(false);
    expect(esMilestoneKind(undefined)).toBe(false);
    expect(esMilestoneKind(3)).toBe(false);
  });
});

describe("etiquetas", () => {
  it("hay etiqueta para todos los tipos", () => {
    for (const kind of MILESTONE_KINDS) {
      expect(MILESTONE_LABELS[kind]).toBeTruthy();
    }
  });

  it("el orden de lectura incluye todos los tipos, sin repetir", () => {
    expect([...MILESTONE_ORDER].sort()).toEqual([...MILESTONE_KINDS].sort());
    expect(new Set(MILESTONE_ORDER).size).toBe(MILESTONE_ORDER.length);
  });
});

describe("agruparPorTipo", () => {
  const hitos = [
    { kind: "PRESS" as const, id: 1 },
    { kind: "EXHIBITION" as const, id: 2 },
    { kind: "EXHIBITION" as const, id: 3 },
  ];

  it("respeta el orden de lectura, no el de llegada", () => {
    expect(agruparPorTipo(hitos).map((grupo) => grupo.kind)).toEqual([
      "EXHIBITION",
      "PRESS",
    ]);
  });

  // Un epígrafe sin nada debajo queda peor que no ponerlo.
  it("descarta los bloques vacíos", () => {
    const grupos = agruparPorTipo(hitos);
    expect(grupos).toHaveLength(2);
    expect(grupos.every((grupo) => grupo.hitos.length > 0)).toBe(true);
  });

  it("no pierde ni duplica ningún hito", () => {
    const total = agruparPorTipo(hitos).reduce(
      (suma, grupo) => suma + grupo.hitos.length,
      0,
    );
    expect(total).toBe(hitos.length);
  });

  it("sin hitos no devuelve ningún bloque", () => {
    expect(agruparPorTipo([])).toEqual([]);
  });
});
