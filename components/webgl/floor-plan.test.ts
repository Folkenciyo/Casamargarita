import { describe, expect, it } from "vitest";
import {
  DOOR_WIDTH,
  layoutFloorPlan,
  planBounds,
  resolveCollision,
  ROOM_DEPTH,
  roomAt,
  roomWallZ,
  treeSpots,
  wallSegments,
} from "./floor-plan";
import type { Room } from "./room-layout";

function room(id: string, wallWidth: number): Room {
  return { id, slug: id, title: id, hung: [], wallWidth };
}

describe("layoutFloorPlan", () => {
  it("acepta que no haya ninguna sala", () => {
    expect(layoutFloorPlan([])).toEqual([]);
  });

  it("una sola sala sale centrada en el origen, como antes de este cambio", () => {
    const [placement] = layoutFloorPlan([room("a", 10)]);
    expect(placement).toMatchObject({ row: 0, col: 0, width: 10, center: { x: 0, z: 0 }, facing: 0 });
    expect(placement!.neighbors).toEqual({});
  });

  it("dos salas van a la misma columna, una en cada fila", () => {
    const placements = layoutFloorPlan([room("a", 10), room("b", 10)]);
    expect(placements[0]).toMatchObject({ row: 0, col: 0, center: { x: 0, z: 0 } });
    expect(placements[1]).toMatchObject({ row: 1, col: 0, center: { x: 0, z: ROOM_DEPTH }, facing: Math.PI });
    expect(placements[0]!.neighbors).toEqual({ south: 1 });
    expect(placements[1]!.neighbors).toEqual({ north: 0 });
  });

  it("la tercera sala abre una columna nueva, vecina al este de la primera", () => {
    const placements = layoutFloorPlan([room("a", 10), room("b", 10), room("c", 6)]);
    expect(placements[2]).toMatchObject({ row: 0, col: 1 });
    expect(placements[0]!.neighbors.east).toBe(2);
    expect(placements[2]!.neighbors.west).toBe(0);
    expect(placements[2]!.neighbors.south).toBeUndefined();
  });

  it("el ancho de columna es el máximo de sus dos salas", () => {
    const placements = layoutFloorPlan([room("a", 6), room("b", 14)]);
    expect(placements[0]!.width).toBe(14);
    expect(placements[1]!.width).toBe(14);
  });

  it("con cuatro salas arma la cuadrícula 2x2 completa", () => {
    const placements = layoutFloorPlan([room("a", 8), room("b", 8), room("c", 8), room("d", 8)]);
    expect(placements.map((p) => p.neighbors)).toEqual([
      { east: 2, south: 1 },
      { east: 3, north: 0 },
      { west: 0, south: 3 },
      { west: 1, north: 2 },
    ]);
  });

  it("una columna impar al final se queda sin vecino al sur", () => {
    const placements = layoutFloorPlan([
      room("a", 8),
      room("b", 8),
      room("c", 8),
      room("d", 8),
      room("e", 8),
    ]);
    expect(placements[4]).toMatchObject({ row: 0, col: 2 });
    expect(placements[4]!.neighbors).toEqual({ west: 2 });
  });

  it("cada fila mira hacia su lado: 0 en la fila 0, Math.PI en la fila 1", () => {
    const placements = layoutFloorPlan([room("a", 8), room("b", 8), room("c", 8), room("d", 8)]);
    expect(placements.map((p) => p.facing)).toEqual([0, Math.PI, 0, Math.PI]);
  });
});

describe("roomWallZ", () => {
  it("la pared del cuadro y la de entrada quedan a ROOM_DEPTH una de otra", () => {
    const [row0, row1] = layoutFloorPlan([room("a", 8), room("b", 8)]);
    const wall0 = roomWallZ(row0!);
    const wall1 = roomWallZ(row1!);
    expect(Math.abs(wall0.entrance - wall0.art)).toBe(ROOM_DEPTH);
    // Las dos salas comparten la pared de entrada: es la misma frontera.
    expect(wall0.entrance).toBe(wall1.entrance);
  });
});

describe("planBounds", () => {
  it("envuelve exactamente una sola sala", () => {
    const placements = layoutFloorPlan([room("a", 8)]);
    expect(planBounds(placements)).toEqual({ minX: -4, maxX: 4, minZ: -6, maxZ: 6 });
  });

  it("envuelve las dos filas y las dos columnas de una cuadrícula 2x2", () => {
    const placements = layoutFloorPlan([room("a", 8), room("b", 8), room("c", 8), room("d", 8)]);
    expect(planBounds(placements)).toEqual({ minX: -4, maxX: 12, minZ: -6, maxZ: 18 });
  });
});

describe("wallSegments", () => {
  it("da un segmento macizo por cada pared exterior de una sola sala", () => {
    const placements = layoutFloorPlan([room("a", 8)]);
    // Cuadro, entrada, este y oeste: las cuatro sin vecino, las cuatro macizas.
    expect(wallSegments(placements)).toHaveLength(4);
  });

  it("abre un hueco de DOOR_WIDTH en la pared compartida entre dos salas contiguas", () => {
    const placements = layoutFloorPlan([room("a", 8), room("b", 8)]);
    const atSharedWall = wallSegments(placements).filter((s) => s.z1 === 6 && s.z2 === 6);
    expect(atSharedWall).toHaveLength(2);
    const covered = atSharedWall.reduce((sum, s) => sum + Math.abs(s.x2 - s.x1), 0);
    expect(8 - covered).toBe(DOOR_WIDTH);
  });

  it("no construye la pared compartida dos veces, una por cada sala", () => {
    const placements = layoutFloorPlan([room("a", 8), room("b", 8), room("c", 8), room("d", 8)]);
    // 2 huecos (uno por columna, norte/sur) + 1 hueco este/oeste = 3 paredes
    // con hueco (2 tramos cada una) + 5 paredes macizas (1 tramo cada una):
    // 2 cuadros, 1 hueco norte/sur en cada columna (comparten frontera, no se
    // duplica), 1 hueco este/oeste, y las exteriores este/oeste sueltas.
    // Serían 16, pero esta cuadrícula completa también genera un cruce de
    // árbol (las 4 salas existen) en el centro: sus 4 brazos son interiores
    // y se omiten enteros, 4 tramos menos — ver "wallSegments cerca de un
    // árbol" para el porqué.
    expect(wallSegments(placements)).toHaveLength(12);
  });
});

describe("wallSegments cerca de un árbol", () => {
  // col1 solo tiene fila 0 (falta "d" en col1/fila1): el brazo sur (b→hueco)
  // y el brazo este (c→hueco) dan de verdad al exterior y se construyen
  // enteros; el brazo norte (a↔c, las dos existen) y el oeste (a↔b, las dos
  // existen) son interiores y no se construyen en absoluto — ni un tramo
  // suelto cerca del árbol.
  const placements = layoutFloorPlan([room("a", 8), room("b", 8), room("c", 6)]);
  const spot = treeSpots(placements)[0]!;
  const segments = wallSegments(placements);

  function touchesSpot(s: { x1: number; z1: number; x2: number; z2: number }): boolean {
    return (
      (Math.abs(s.x1 - spot.x) < 1e-9 && Math.abs(s.z1 - spot.z) < 1e-9) ||
      (Math.abs(s.x2 - spot.x) < 1e-9 && Math.abs(s.z2 - spot.z) < 1e-9)
    );
  }

  it("marca los brazos según qué salas existen a cada lado", () => {
    expect(spot).toMatchObject({
      interiorNorth: true, // a↔c, las dos existen
      interiorSouth: false, // b↔hueco
      interiorWest: true, // a↔b, las dos existen
      interiorEast: false, // c↔hueco
    });
  });

  it("los dos brazos que dan al hueco de la sala que falta llegan enteros al cruce", () => {
    expect(segments.filter(touchesSpot)).toHaveLength(2);
  });

  it("los brazos interiores no dejan ningún resto: dos segmentos de menos", () => {
    // Arte(3) + entrada(2: "a" con puerta, "c" maciza) + este(3: "a" con
    // puerta, "b" y "c" macizas) + oeste(2: "a" y "b") = 10. Sin el árbol
    // serían 12 —los 2 tramos que se omiten enteros son el este de "a" hacia
    // el norte y la entrada de "a" hacia el oeste, los dos brazos
    // interiores—, sin dejar ningún resto corto en su lugar.
    expect(segments).toHaveLength(10);
  });

  it("acercarse desde fuera a uno de los brazos que llegan enteros (sur) empuja", () => {
    // Justo al lado de la línea del muro (no encima, donde la distancia
    // sería 0 y `resolveCollision` no tendría dirección hacia la que
    // empujar), a la altura en la que ese brazo ya es macizo.
    const resolved = resolveCollision(segments, spot.x + 0.1, spot.z + 0.05, 0.3);
    expect(resolved).not.toEqual({ x: spot.x + 0.1, z: spot.z + 0.05 });
  });

  it("el hueco que dejan los brazos interiores (norte y oeste) queda del todo despejado", () => {
    // Bien dentro de lo que antes ocupaban esos tramos —no solo un margen
    // pequeño junto al cruce—: aquí no queda ni rastro de pared.
    expect(resolveCollision(segments, spot.x - 2, spot.z, 0.3)).toEqual({ x: spot.x - 2, z: spot.z });
    expect(resolveCollision(segments, spot.x, spot.z - 2, 0.3)).toEqual({ x: spot.x, z: spot.z - 2 });
  });
});

describe("resolveCollision", () => {
  const placements = layoutFloorPlan([room("a", 8), room("b", 8)]);
  const segments = wallSegments(placements);

  it("no empuja un punto lejos de toda pared", () => {
    expect(resolveCollision(segments, 0, 0, 0.3)).toEqual({ x: 0, z: 0 });
  });

  it("deja pasar por el centro del hueco de la puerta sin empujar", () => {
    expect(resolveCollision(segments, 0, 6, 0.3)).toEqual({ x: 0, z: 6 });
  });

  it("empuja fuera de un tramo de pared maciza", () => {
    // x=-2 cae dentro del tramo macizo -4..-1 de la pared compartida (z=6).
    const resolved = resolveCollision(segments, -2, 6.05, 0.3);
    expect(Math.abs(resolved.z - 6)).toBeGreaterThanOrEqual(0.3 - 1e-9);
  });
});

describe("treeSpots", () => {
  it("vacío sin salas", () => {
    expect(treeSpots([])).toEqual([]);
  });

  it("vacío con una sola columna, aunque le falte la fila 1", () => {
    expect(treeSpots(layoutFloorPlan([room("a", 8)]))).toEqual([]);
  });

  it("un árbol en el cruce, con solo tres salas (falta la fila 1 de la columna 1)", () => {
    const placements = layoutFloorPlan([room("a", 8), room("b", 8), room("c", 6)]);
    // El cruce cae en el borde compartido: el este de la columna 0.
    const boundaryX = placements[0]!.center.x + placements[0]!.width / 2;
    // Falta la sala al sureste: los brazos norte/oeste (entre dos salas
    // reales) son interiores, no se construyen; sur/este (los que dan al
    // hueco) sí, enteros.
    expect(treeSpots(placements)).toEqual([
      {
        x: boundaryX,
        z: ROOM_DEPTH / 2,
        interiorNorth: true,
        interiorSouth: false,
        interiorWest: true,
        interiorEast: false,
      },
    ]);
  });

  it("un árbol donde convergen las cuatro salas, con la cuadrícula 2x2 completa", () => {
    const placements = layoutFloorPlan([room("a", 8), room("b", 8), room("c", 8), room("d", 8)]);
    // Las cuatro salas existen: los cuatro brazos son interiores, ninguno se construye.
    expect(treeSpots(placements)).toEqual([
      {
        x: 4,
        z: ROOM_DEPTH / 2,
        interiorNorth: true,
        interiorSouth: true,
        interiorWest: true,
        interiorEast: true,
      },
    ]);
  });

  it("dos árboles con cinco salas: 1-2-3-4 y 3-4-5", () => {
    const placements = layoutFloorPlan([
      room("a", 8),
      room("b", 8),
      room("c", 8),
      room("d", 8),
      room("e", 6),
    ]);
    const boundary0 = placements[0]!.center.x + placements[0]!.width / 2;
    const boundary1 = placements[2]!.center.x + placements[2]!.width / 2;
    // El primer cruce (1-2-3-4) tiene las cuatro salas: todo interior.
    // El segundo (3-4-5) le falta la sala al sureste, como el caso de tres
    // salas de más arriba.
    expect(treeSpots(placements)).toEqual([
      {
        x: boundary0,
        z: ROOM_DEPTH / 2,
        interiorNorth: true,
        interiorSouth: true,
        interiorWest: true,
        interiorEast: true,
      },
      {
        x: boundary1,
        z: ROOM_DEPTH / 2,
        interiorNorth: true,
        interiorSouth: false,
        interiorWest: true,
        interiorEast: false,
      },
    ]);
  });

  it("un árbol por cada frontera interna, con el edificio 8 salas / 4 columnas completo", () => {
    const rooms = Array.from({ length: 8 }, (_, i) => room(`r${i}`, 8));
    const placements = layoutFloorPlan(rooms);
    expect(treeSpots(placements)).toHaveLength(3);
  });
});

describe("roomAt", () => {
  const placements = layoutFloorPlan([room("a", 8), room("b", 8), room("c", 8), room("d", 8)]);

  it("acierta la sala de un punto en su interior", () => {
    expect(roomAt(placements, 0, 0)).toBe(0);
    expect(roomAt(placements, 0, 12)).toBe(1);
    expect(roomAt(placements, 8, 0)).toBe(2);
    expect(roomAt(placements, 8, 12)).toBe(3);
  });

  it("null fuera del edificio", () => {
    expect(roomAt(placements, 100, 100)).toBeNull();
  });
});
