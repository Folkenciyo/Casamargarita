import type { Room } from "./room-layout";

/**
 * Coloca las salas ya calculadas por `buildRooms` en un plano de museo real:
 * cuadrícula de 2 filas × N columnas, rellenada por columnas en el orden de
 * llegada (serie 1 → fila 0 col 0, serie 2 → fila 1 col 0, serie 3 → fila 0
 * col 1...). Puro: no toca three.js, solo geometría en el plano XZ.
 */

/** Metros de fondo de cada sala (distancia entre la pared del cuadro y la
 * pared de entrada). */
export const ROOM_DEPTH = 12;

/** Ancho del hueco que se abre en una pared compartida entre dos salas. */
export const DOOR_WIDTH = 2;

/** 0 = el cuadro mira hacia `z` negativa (como la sala única de hoy).
 * `Math.PI` = mira hacia `z` positiva, girada 180°. */
export type Facing = 0 | typeof Math.PI;

export type Neighbors = {
  north?: number;
  south?: number;
  east?: number;
  west?: number;
};

export type Placement = {
  room: Room;
  row: 0 | 1;
  col: number;
  /** Ancho de la sala a efectos de pared: el de su columna, no
   * `room.wallWidth` — las dos salas de una columna comparten pared. */
  width: number;
  center: { x: number; z: number };
  facing: Facing;
  /** Índices en el array devuelto por `layoutFloorPlan`. */
  neighbors: Neighbors;
};

/** +1 si el cuadro de esa sala mira a -Z (fila 0), -1 si mira a +Z (fila 1). */
export function facingSign(facing: Facing): 1 | -1 {
  return facing === 0 ? 1 : -1;
}

/** z de la pared del cuadro y z de la pared de entrada de una sala —
 * siempre a `ROOM_DEPTH` una de la otra, en el sentido que marca `facing`. */
export function roomWallZ(placement: Pick<Placement, "center" | "facing">): {
  art: number;
  entrance: number;
} {
  const sign = facingSign(placement.facing);
  return {
    art: placement.center.z - sign * (ROOM_DEPTH / 2),
    entrance: placement.center.z + sign * (ROOM_DEPTH / 2),
  };
}

export type PlanBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Caja que envuelve todas las salas del plano — la usan el suelo único y
 * el minimapa. */
export function planBounds(placements: Placement[]): PlanBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const p of placements) {
    const { art, entrance } = roomWallZ(p);
    minX = Math.min(minX, p.center.x - p.width / 2);
    maxX = Math.max(maxX, p.center.x + p.width / 2);
    minZ = Math.min(minZ, Math.min(art, entrance));
    maxZ = Math.max(maxZ, Math.max(art, entrance));
  }

  return { minX, maxX, minZ, maxZ };
}

export type TreeSpot = {
  x: number;
  z: number;
  /** Un brazo entre dos salas que existen las dos es un muro interior —ya
   * tiene su propia puerta en otro punto de su pared— y no necesita
   * construirse cerca del cruce en absoluto: ese tramo se omite entero, sin
   * dejar ni un cabo suelto. Un brazo que da directamente al hueco de la
   * sala que falta es de verdad frontera con el exterior: se construye tal
   * cual, tocando el cruce. `north`/`south` son los dos brazos del muro
   * entre columnas (fila 0 y fila 1 respectivamente); `west`/`east`, los dos
   * brazos del muro entre filas (columna izquierda y derecha del cruce). */
  interiorNorth: boolean;
  interiorSouth: boolean;
  interiorWest: boolean;
  interiorEast: boolean;
};

/**
 * Dónde plantar un árbol: en cada frontera interna entre dos columnas
 * contiguas, en el punto exacto donde se cruzan su pared compartida (el eje
 * X) y la línea de la pared de entrada (el eje Z, la misma para cualquier
 * columna) — el cruce de caminos, no el centro de ninguna sala.
 *
 * Una frontera solo cuenta si al menos 3 de las 4 salas que la rodean (las
 * dos filas de cada una de las dos columnas) ya existen: con menos, ese
 * cruce no tiene paredes de sobra a su alrededor para que un árbol tenga
 * sentido ahí. Con 2 columnas solo hay una frontera; con N columnas, hasta
 * N-1 —un edificio completo saca un árbol por cada una—.
 */
export function treeSpots(placements: Placement[]): TreeSpot[] {
  if (placements.length === 0) return [];
  const columnCount = Math.max(...placements.map((p) => p.col)) + 1;
  const spots: TreeSpot[] = [];

  function hasRoom(col: number, row: 0 | 1): boolean {
    return placements.some((p) => p.col === col && p.row === row);
  }

  for (let col = 0; col < columnCount - 1; col++) {
    const topLeft = hasRoom(col, 0);
    const topRight = hasRoom(col + 1, 0);
    const bottomLeft = hasRoom(col, 1);
    const bottomRight = hasRoom(col + 1, 1);
    const count = [topLeft, topRight, bottomLeft, bottomRight].filter(Boolean).length;
    if (count < 3) continue;

    // Con al menos 3 de las 4 salas presentes, las dos columnas tienen
    // garantizada al menos una sala cada una (el máximo por columna es 2).
    const left = placements.find((p) => p.col === col)!;
    spots.push({
      x: left.center.x + left.width / 2,
      z: ROOM_DEPTH / 2,
      interiorNorth: topLeft && topRight,
      interiorSouth: bottomLeft && bottomRight,
      interiorWest: topLeft && bottomLeft,
      interiorEast: topRight && bottomRight,
    });
  }

  return spots;
}

export type WallSegment = { x1: number; z1: number; x2: number; z2: number };

/** Tolerancia para comparar coordenadas de coma flotante que deberían
 * coincidir exactamente (mismo `center`/`width` en ambos cálculos). */
const EPSILON = 1e-6;

/** Si el brazo que llega a `spot` desde `(otherX, otherZ)` es interior:
 * depende de a qué lado del cruce cae ese otro extremo, no de la sala a la
 * que pertenezca el segmento —el mismo cálculo vale para cualquiera de los
 * dos tramos que forman un mismo brazo continuo (ej. el muro este de dos
 * salas apiladas). */
function isInteriorArm(otherX: number, otherZ: number, spot: TreeSpot, vertical: boolean): boolean {
  if (vertical) return otherZ < spot.z ? spot.interiorNorth : spot.interiorSouth;
  return otherX < spot.x ? spot.interiorWest : spot.interiorEast;
}

/** Si `segment` toca un cruce con árbol por un brazo interior (entre dos
 * salas que existen las dos), no se construye en absoluto — esa sala ya
 * tiene su puerta en otro punto de su pared, no hace falta ningún tramo
 * suelto cerca del árbol. Un segmento que toca el cruce por un brazo que da
 * al hueco de la sala que falta sí es una frontera real y se conserva. */
function keepNearTreeSpots(segment: WallSegment, spots: TreeSpot[]): boolean {
  const vertical = segment.x1 === segment.x2;
  for (const spot of spots) {
    if (Math.abs(segment.x1 - spot.x) < EPSILON && Math.abs(segment.z1 - spot.z) < EPSILON) {
      if (isInteriorArm(segment.x2, segment.z2, spot, vertical)) return false;
    }
    if (Math.abs(segment.x2 - spot.x) < EPSILON && Math.abs(segment.z2 - spot.z) < EPSILON) {
      if (isInteriorArm(segment.x1, segment.z1, spot, vertical)) return false;
    }
  }
  return true;
}

/** Un tramo de pared sin hueco es un único segmento; con hueco, dos —antes y
 * después del vano, centrado— con el ancho de puerta descontado del medio. */
function doorSplit(length: number, gapped: boolean): Array<{ offset: number; width: number }> {
  if (!gapped) return [{ offset: 0, width: length }];
  const width = (length - DOOR_WIDTH) / 2;
  const centre = DOOR_WIDTH / 2 + width / 2;
  return [
    { offset: -centre, width },
    { offset: centre, width },
  ];
}

/**
 * Todas las paredes macizas del museo, en coordenadas de mundo y sin los
 * tramos de los huecos de puerta — la misma decisión que toma
 * `build-room.ts:buildFloorPlan` sobre qué pared es maciza y cuál lleva
 * hueco, pero como datos: la usan tanto el dibujado como la colisión, así
 * que no pueden desincronizarse.
 *
 * Un segmento con `z1 === z2` corre a lo largo de X (la pared del cuadro o
 * la de entrada de una sala); con `x1 === x2`, a lo largo de Z (una pared
 * lateral).
 *
 * Cerca de un árbol (`treeSpots`) no todos los brazos se construyen: el que
 * separa dos salas que existen las dos se omite entero —ya tiene puerta en
 * otro punto de su pared, no necesita ningún tramo cerca del cruce—; el que
 * da directamente al hueco de la sala que falta se construye tal cual,
 * porque de verdad hace de frontera con el exterior.
 */
export function wallSegments(placements: Placement[]): WallSegment[] {
  const segments: WallSegment[] = [];

  function addXWall(centerX: number, z: number, length: number, gapped: boolean) {
    for (const { offset, width } of doorSplit(length, gapped)) {
      segments.push({
        x1: centerX + offset - width / 2,
        z1: z,
        x2: centerX + offset + width / 2,
        z2: z,
      });
    }
  }

  function addZWall(x: number, centerZ: number, gapped: boolean) {
    for (const { offset, width } of doorSplit(ROOM_DEPTH, gapped)) {
      segments.push({
        x1: x,
        z1: centerZ + offset - width / 2,
        x2: x,
        z2: centerZ + offset + width / 2,
      });
    }
  }

  for (const p of placements) {
    const { art, entrance } = roomWallZ(p);
    const eastX = p.center.x + p.width / 2;
    const westX = p.center.x - p.width / 2;

    // La pared del cuadro nunca tiene vecino al otro lado: siempre es el
    // borde exterior del edificio.
    addXWall(p.center.x, art, p.width, false);

    // La pared de entrada la construye solo la fila 0: es la misma pared
    // compartida que la fila 1 tiene detrás de su cuadro.
    if (p.row === 0) addXWall(p.center.x, entrance, p.width, p.neighbors.south !== undefined);

    // Cada sala construye su propia pared este; la del oeste solo si no hay
    // vecina ahí.
    addZWall(eastX, p.center.z, p.neighbors.east !== undefined);
    if (p.col === 0) addZWall(westX, p.center.z, false);
  }

  const spots = treeSpots(placements);
  if (spots.length === 0) return segments;
  return segments.filter((segment) => keepNearTreeSpots(segment, spots));
}

/** El punto de un segmento más cercano a (x, z). */
function closestPointOnSegment(
  segment: WallSegment,
  x: number,
  z: number,
): { x: number; z: number } {
  const dx = segment.x2 - segment.x1;
  const dz = segment.z2 - segment.z1;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq === 0) return { x: segment.x1, z: segment.z1 };

  const t = Math.max(0, Math.min(1, ((x - segment.x1) * dx + (z - segment.z1) * dz) / lengthSq));
  return { x: segment.x1 + t * dx, z: segment.z1 + t * dz };
}

/**
 * Empuja (x, z) fuera de cualquier segmento a menos de `radius` — un solo
 * paso por todos los segmentos, de sobra para un plano tan pequeño: se
 * llama cada fotograma, así que un empuje algo imperfecto en una esquina
 * rara se autocorrige al fotograma siguiente.
 */
export function resolveCollision(
  segments: WallSegment[],
  x: number,
  z: number,
  radius: number,
): { x: number; z: number } {
  let cx = x;
  let cz = z;

  for (const segment of segments) {
    const closest = closestPointOnSegment(segment, cx, cz);
    const dx = cx - closest.x;
    const dz = cz - closest.z;
    const distance = Math.hypot(dx, dz);
    if (distance === 0 || distance >= radius) continue;
    const push = (radius - distance) / distance;
    cx += dx * push;
    cz += dz * push;
  }

  return { x: cx, z: cz };
}

/** Índice de la sala cuya caja contiene (x, z), o null si no hay ninguna
 * (no debería pasar estando dentro del edificio, pero por si acaso). */
export function roomAt(placements: Placement[], x: number, z: number): number | null {
  for (let index = 0; index < placements.length; index++) {
    const p = placements[index]!;
    const { art, entrance } = roomWallZ(p);
    const minZ = Math.min(art, entrance);
    const maxZ = Math.max(art, entrance);
    if (x >= p.center.x - p.width / 2 && x <= p.center.x + p.width / 2 && z >= minZ && z <= maxZ) {
      return index;
    }
  }
  return null;
}

export function layoutFloorPlan(rooms: Room[]): Placement[] {
  if (rooms.length === 0) return [];

  const columnCount = Math.ceil(rooms.length / 2);
  const columnWidths: number[] = [];
  for (let col = 0; col < columnCount; col++) {
    const a = rooms[col * 2];
    const b = rooms[col * 2 + 1];
    columnWidths.push(Math.max(a?.wallWidth ?? 0, b?.wallWidth ?? 0));
  }

  // Columna 0 centrada en x=0: con una sola sala, el plano sale idéntico al
  // de la sala única de antes de este cambio.
  const columnCenterX: number[] = [0];
  for (let col = 1; col < columnCount; col++) {
    columnCenterX.push(
      columnCenterX[col - 1]! + columnWidths[col - 1]! / 2 + columnWidths[col]! / 2,
    );
  }

  return rooms.map((room, index) => {
    const col = Math.floor(index / 2);
    const row = (index % 2) as 0 | 1;
    const neighbors: Neighbors = {};

    if (index + 2 < rooms.length) neighbors.east = index + 2;
    if (index - 2 >= 0) neighbors.west = index - 2;
    if (row === 0 && index + 1 < rooms.length) neighbors.south = index + 1;
    if (row === 1) neighbors.north = index - 1;

    return {
      room,
      row,
      col,
      width: columnWidths[col]!,
      center: { x: columnCenterX[col]!, z: row === 0 ? 0 : ROOM_DEPTH },
      facing: row === 0 ? 0 : Math.PI,
      neighbors,
    };
  });
}
