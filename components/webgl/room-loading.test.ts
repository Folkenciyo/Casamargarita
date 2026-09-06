import { describe, expect, it } from "vitest";
import {
  ROOM_LOAD_PHASES,
  roomLoadLabel,
  roomLoadProgress,
  type RoomLoadPhaseId,
} from "./room-loading";

describe("ROOM_LOAD_PHASES", () => {
  it("reparte la barra entera entre las fases", () => {
    const total = ROOM_LOAD_PHASES.reduce((sum, phase) => sum + phase.weight, 0);
    expect(total).toBeCloseTo(1);
  });

  it("no repite ninguna fase", () => {
    const ids = ROOM_LOAD_PHASES.map((phase) => phase.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("da un texto a cada fase", () => {
    expect(ROOM_LOAD_PHASES.every((phase) => phase.label.length > 0)).toBe(true);
  });
});

describe("roomLoadProgress", () => {
  it("empieza en cero en la primera fase", () => {
    expect(roomLoadProgress(ROOM_LOAD_PHASES[0]!.id, 0)).toBe(0);
  });

  it("termina en uno al acabar la última", () => {
    const last = ROOM_LOAD_PHASES[ROOM_LOAD_PHASES.length - 1]!;
    expect(roomLoadProgress(last.id, 1)).toBeCloseTo(1);
  });

  it("nunca retrocede al avanzar de fase en fase", () => {
    const valores = ROOM_LOAD_PHASES.flatMap((phase) => [
      roomLoadProgress(phase.id, 0),
      roomLoadProgress(phase.id, 0.5),
      roomLoadProgress(phase.id, 1),
    ]);
    for (let i = 1; i < valores.length; i++) {
      expect(valores[i]!).toBeGreaterThanOrEqual(valores[i - 1]!);
    }
  });

  it("el final de una fase es el principio de la siguiente", () => {
    for (let i = 1; i < ROOM_LOAD_PHASES.length; i++) {
      const anterior = roomLoadProgress(ROOM_LOAD_PHASES[i - 1]!.id, 1);
      const siguiente = roomLoadProgress(ROOM_LOAD_PHASES[i]!.id, 0);
      expect(siguiente).toBeCloseTo(anterior);
    }
  });

  it("recorta lo que se salga de 0 a 1", () => {
    const phase = ROOM_LOAD_PHASES[1]!;
    expect(roomLoadProgress(phase.id, -3)).toBeCloseTo(roomLoadProgress(phase.id, 0));
    expect(roomLoadProgress(phase.id, 7)).toBeCloseTo(roomLoadProgress(phase.id, 1));
  });

  it("trata un progreso indefinido como cero, no como NaN", () => {
    expect(roomLoadProgress("descargas", Number.NaN)).toBeCloseTo(
      roomLoadProgress("descargas", 0),
    );
  });

  it("una fase desconocida no rompe la barra", () => {
    expect(roomLoadProgress("inventada" as RoomLoadPhaseId, 0.5)).toBeCloseTo(1);
  });
});

describe("roomLoadLabel", () => {
  it("devuelve el texto de la fase", () => {
    expect(roomLoadLabel("descargas")).toBe("Extendiendo la pintura");
  });

  it("devuelve vacío para una fase que no existe", () => {
    expect(roomLoadLabel("inventada" as RoomLoadPhaseId)).toBe("");
  });
});
