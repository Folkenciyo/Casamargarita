import * as THREE from "three";
import type { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  facingSign,
  planBounds,
  ROOM_DEPTH,
  roomWallZ,
  treeSpots,
  wallSegments,
  type Placement,
} from "./floor-plan";
import { EYE_LEVEL, WALL_HEIGHT } from "./room-layout";

/**
 * Construcción y liberación de la geometría del museo, separada en dos
 * funciones que se llaman una vez cada una al montar —el museo entero se
 * carga de golpe, nada se reconstruye al moverse—:
 *
 * - `buildFloorPlan`: paredes, suelo y huecos de puerta de todas las salas.
 * - `buildRoomPaintings`: marcos, lienzos y focos de una sala; se llama una
 *   vez por sala.
 */

const FRAME_DEPTH = 0.06;
const FRAME_BORDER = 0.05;

/**
 * Suelo de luz propia del lienzo, independiente del aplique o del entorno.
 *
 * El aplique normaliza su intensidad al centro del cuadro (ver más abajo,
 * `lightDistance`), pero eso solo iguala un punto: un cuadro alto se queda
 * oscuro por abajo porque el foco está montado arriba, y de noche —con las
 * luces de relleno casi apagadas, `FILL_BY_THEME` en `Room3D.tsx`— cualquier
 * obra que no reciba bien su aplique se va a negro. `emissiveMap` con la
 * propia textura del cuadro es la salida: brilla con sus propios colores, no
 * con un blanco plano, así que la iluminación de verdad sigue dándole
 * contraste por encima sin que se note un suelo de luz aparte.
 */
const PAINTING_BASE_EMISSIVE = 0.4;

/**
 * Resplandor del marco al acercarse, antes de hacer clic — refuerza que el
 * cuadro es interactivo sin depender del hover del ratón, que casi no se usa
 * en un museo que se recorre con WASD. Cada marco necesita su propio
 * material —`materials.frame` se comparte entre todos— para que el brillo
 * sea de la obra a la que te acercas, no de todas a la vez.
 */
const FRAME_GLOW_COLOR = "#8c3f24"; // --color-oil de la casa
/** Máxima `emissiveIntensity` del marco, pegado al cuadro. Lo aplica
 * `Room3D.tsx` cada fotograma; se exportan junto al color para que el
 * cálculo de la caída con la distancia viva en un solo sitio. */
export const FRAME_GLOW_MAX = 0.7;
/** Metros desde el centro del lienzo a partir de los cuales el resplandor ya
 * no crece más — aproximadamente donde `distanceFor` planta la cámara en la
 * vista general, así que ya se ve un principio de brillo al entrar en la
 * sala, no solo pegado al cuadro. */
export const FRAME_GLOW_RADIUS = 5;

/** Carcasa del aplique de luz: una caja sencilla montada en la pared, encima
 * del cuadro. Su ancho se deduce del cuadro (como el resto de proporciones
 * del museo), con un mínimo para que no desaparezca sobre una obra pequeña. */
const FIXTURE_HEIGHT = 0.12;
const FIXTURE_DEPTH = 0.16;
const FIXTURE_GAP_ABOVE_PAINTING = 0.15;
const FIXTURE_WIDTH_RATIO = 0.55;
const FIXTURE_MIN_WIDTH = 0.3;

/** Cartel con el nombre de la serie, encima de los apliques: una placa con
 * relieve de verdad (una `RoundedBoxGeometry`, no un plano) y el texto —una
 * textura de canvas, nada de geometría de letras— pegado a su cara delantera.
 * El tamaño de la placa lo decide esa textura: cada carácter ocupa lo mismo
 * en metros en cualquier sala, así que un título largo da una placa más
 * ancha, no letras más apretadas. */
const SIGN_FONT_SIZE_PX = 58;
const SIGN_LETTER_SPACING_PX = 1.5;
const SIGN_PADDING_X_PX = 34;
const SIGN_PADDING_Y_PX = 24;
const SIGN_PIXELS_PER_METER = 380;
const SIGN_DEPTH = 0.018;
const SIGN_CORNER_RADIUS = 0.03;
const SIGN_PLAQUE_COLOR = "#f4f0e8";
/** Altura por defecto: bien arriba de la pared, por encima de la cabeza. */
const SIGN_PREFERRED_Y = WALL_HEIGHT - 0.5;
/** Aire mínimo por si una obra alta empuja su aplique más arriba que la
 * altura por defecto —entonces el cartel sube con él, no al revés. */
const SIGN_MIN_GAP_ABOVE_FIXTURES = 0.3;
const SIGN_INK = "#1a1714";

/** Margaritas sueltas por el suelo: un decal con seis flores distintas en
 * una rejilla de 3×2 (`FlowerSet001` de ambientCG, color y opacidad ya
 * combinados por `pnpm build:flower-decal`) — cada instancia recorta una
 * celda al azar por su UV, así no se repite siempre la misma flor. */
const FLOWER_DECAL_TEXTURE = "/Sala/margaritas/decal.webp";
const FLOWER_ATLAS_COLS = 3;
const FLOWER_ATLAS_ROWS = 2;
/** Flores por metro cuadrado de suelo, con un tope por sala para no disparar
 * el número de instancias en una sala grande. */
const FLOWER_DENSITY = 0.12;
const FLOWER_MAX_PER_ROOM = 40;
const FLOWER_MIN_SIZE = 0.16;
const FLOWER_MAX_SIZE = 0.3;
/** Aire hasta la pared: ninguna flor nace pegada a un marco o una puerta. */
const FLOWER_WALL_MARGIN = 0.6;
const FLOWER_MAX_TILT = THREE.MathUtils.degToRad(6);

/** Hojas de césped sueltas en matas de 2, 4 o 6 —no una por una como las
 * margaritas—, concentradas cerca de las paredes (`Foliage006` de
 * ambientCG, combinado por `pnpm build:foliage-decal`). A diferencia del
 * decal de margaritas, que se tumba en el suelo, cada hoja se planta de pie
 * —nace con el origen en su base, no en el centro—. Todas las hojas de una
 * misma mata comparten el punto de anclaje exacto; lo que cambia es hacia
 * qué lado se abre cada una, inclinada desde ese punto —nunca hacia abajo,
 * solo por encima del suelo—, como un manojo de verdad y no una fila de
 * agujas verticales paralelas. */
const FOLIAGE_DECAL_TEXTURE = "/Sala/hojas/decal.webp";
const FOLIAGE_ATLAS_COLS = 4;
const FOLIAGE_ATLAS_ROWS = 2;
const FOLIAGE_TUFT_COUNTS = [2, 4, 6] as const;
const FOLIAGE_BLADE_MIN_HEIGHT = 0.21;
const FOLIAGE_BLADE_MAX_HEIGHT = 0.39;
/** Cuánto se abre cada hoja desde la vertical, como mucho —0° sería un
 * manojo de agujas rectas, demasiado cerca de 90° las tumbaría casi al
 * suelo—. */
const FOLIAGE_MAX_SPREAD = THREE.MathUtils.degToRad(38);
/** Matas por metro cuadrado de suelo, con un tope por sala. */
const FOLIAGE_TUFT_DENSITY = 0.08;
const FOLIAGE_MAX_TUFTS_PER_ROOM = 55;
const FOLIAGE_WALL_MARGIN = 0.12;
/** Dentro de esta franja junto a cualquier pared, una mata candidata entra
 * siempre; más allá, solo una de cada ocho —de ahí sale la concentración
 * junto a las paredes sin dejar el resto de la sala pelado. */
const FOLIAGE_WALL_BAND = 1.6;
const FOLIAGE_FAR_ACCEPT_CHANCE = 0.12;

/** Los árboles de los cruces entre columnas —ver `treeSpots` en
 * `floor-plan.ts`—: un modelo comprado (`tree 3d model free.zip`, TODO.md),
 * de tres materiales por nombre (`Bark` el tronco, `Branch_1`/`Branch_2` el
 * follaje), reconstruidos aquí con las mismas texturas en webp en vez de las
 * que trae el `.fbx` de fábrica. Se carga una sola vez y se clona por cada
 * cruce: los clones comparten geometría y materiales, solo cambia dónde
 * se colocan. */
const TREE_MODEL = "/Sala/arbol/tree.fbx";
const TREE_TRUNK_TEXTURE = "/Sala/arbol/trunk";
const TREE_FOLIAGE_TEXTURE = "/Sala/arbol/foliage";

/**
 * Dentro del `.fbx` siguen escritos los nombres que su autor le puso a las
 * texturas (`Peppertree_..._Color_png_Tex.png`, `BrPepper_Trunk_...`), y el
 * cargador de three intenta traerlas de `/Sala/arbol/` sin preguntar. Ahí no
 * están —las nuestras son los `.webp` convertidos— y, aunque estuvieran,
 * `buildCornerTrees` tira los materiales del modelo nada más cargarlo para
 * poner los suyos. Eran cuatro 404 en cada entrada a la sala, por nada.
 *
 * `interceptarTexturasDelArbol` las sustituye por un píxel transparente ya en
 * memoria: el cargador recibe su imagen, no sale ninguna petición y el gestor
 * de carga sigue contando el fichero como cualquier otro.
 */
const PIXEL_TRANSPARENTE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function interceptarTexturasDelArbol(url: string): string {
  const esTexturaDeFabrica = url.startsWith("/Sala/arbol/") && url.endsWith("_Tex.png");
  return esTexturaDeFabrica ? PIXEL_TRANSPARENTE : url;
}
/** Ligero margen sobre el suelo: la base del modelo original queda una pizca
 * por debajo de y=0. */
const TREE_GROUND_OFFSET = 0.1;
/** El `.fbx` no trae el factor de escala de la unidad que usó su exportador
 * —sale con más de 700 m de alto tal cual—: este factor lo deja en los ~7,5 m
 * reales del modelo original (medidos en su `.obj`, con la misma geometría). */
const TREE_SCALE = 0.0105;

const WALL_TEXTURE = "/Sala/pared";
const FLOOR_TEXTURE = "/Sala/suelo";
const FRAME_TEXTURE = "/Sala/madera";
const PATH_TEXTURE = "/Sala/camino";

const WALL_TILE_METERS = 2.2;
const FLOOR_TILE_METERS = 1.4;
const PATH_TILE_METERS = 1;

/** Ancho del camino de piedra: el pasillo central de cada sala, y el mismo
 * ancho para el tramo que marca la zona de visita frente a los cuadros. */
const PATH_WIDTH = 2.4;
/** Cuánto se acerca el tramo frente a los cuadros a la pared del cuadro —no
 * es la distancia exacta a la que se para la cámara en la vista general
 * (esa depende del ancho de cada obra y del FOV, se calcula en
 * `Room3D.tsx`), es una marca aproximada de "aquí se para a mirar", que no
 * necesita ser milimétrica. */
const PATH_VIEWING_DISTANCE = 4.5;

/**
 * Cuánto del HDRI de entorno reciben pared, suelo y marco — de 0 a 1, el
 * valor por defecto de three.js es 1. Con el HDRI a intensidad completa el
 * reflejo se comía la escena; se deja en la mitad, sin tocar las luces
 * directas (los focos por obra siguen igual).
 */
const ROOM_ENV_INTENSITY = 0.4;

/**
 * El suelo por separado, más bajo que `ROOM_ENV_INTENSITY`: es la superficie
 * más horizontal de la sala, así que es la que más ángulo rasante recibe de
 * la cámara —y ahí el reflejo del cielo se dispara aunque el material sea
 * bien rugoso (así funciona Fresnel, no es un fallo de la textura—. A
 * intensidad completa el césped brillaba como plástico mojado.
 */
const FLOOR_ENV_INTENSITY = 0.08;

/**
 * Alto de pared de sobra por encima de `WALL_HEIGHT`: puramente estético, un
 * remate corto para que el borde superior no se vea como un corte recto
 * contra el cielo. Antes del HDRI de cielo tenía que ser mucho más alto
 * —8 m— para tapar el vacío negro de encima; con un cielo de verdad ya no
 * hace falta esconder nada, así que se baja a la mitad de la pared
 * funcional. No afecta al plano —ancho y fondo son exactos, porque de eso
 * depende que los huecos de puerta encajen entre salas vecinas.
 */
const WALL_EXTRA_HEIGHT = WALL_HEIGHT / 2;

export type RoomMaterials = {
  wall: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  fixture: THREE.MeshStandardMaterial;
  path: THREE.MeshStandardMaterial;
};

/** Un mapa PBR. El repeat se deja en (1,1): con paredes de anchos distintos
 * compartiendo el mismo material, el tileado se ajusta por geometría (ver
 * `scaleUVs`), no por textura. */
function loadMap(
  textureLoader: THREE.TextureLoader,
  base: string,
  kind: "color" | "normal" | "roughness",
  onLoad: () => void,
): THREE.Texture {
  const texture = textureLoader.load(`${base}/${kind}.webp`, onLoad);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // Solo el color es una foto; normal y rugosidad son datos, no color, y
  // marcarlos sRGB desvirtúa lo que cuentan.
  if (kind === "color") texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Los tres materiales PBR compartidos por todo el museo. Pared y suelo se
 * usan en muchos segmentos de tamaños distintos a la vez, así que van
 * `DoubleSide` — así no hay que acertar con la rotación de cada segmento
 * para que la cara visible sea la correcta desde dentro de su sala.
 */
export function createRoomMaterials(
  renderer: THREE.WebGLRenderer,
  textureLoader: THREE.TextureLoader,
  onLoad: () => void,
): { materials: RoomMaterials; disposables: THREE.Texture[] } {
  const disposables: THREE.Texture[] = [];
  const anisotropy = renderer.capabilities.getMaxAnisotropy();

  function maps(base: string): [THREE.Texture, THREE.Texture, THREE.Texture] {
    const color = loadMap(textureLoader, base, "color", onLoad);
    const normal = loadMap(textureLoader, base, "normal", onLoad);
    const roughness = loadMap(textureLoader, base, "roughness", onLoad);
    for (const texture of [color, normal, roughness]) {
      texture.anisotropy = anisotropy;
      disposables.push(texture);
    }
    return [color, normal, roughness];
  }

  const [wallColor, wallNormal, wallRoughness] = maps(WALL_TEXTURE);
  const [floorColor, floorNormal, floorRoughness] = maps(FLOOR_TEXTURE);
  const [frameColor, frameNormal, frameRoughness] = maps(FRAME_TEXTURE);
  const [pathColor, pathNormal, pathRoughness] = maps(PATH_TEXTURE);

  const materials: RoomMaterials = {
    wall: new THREE.MeshStandardMaterial({
      map: wallColor,
      normalMap: wallNormal,
      roughnessMap: wallRoughness,
      envMapIntensity: ROOM_ENV_INTENSITY,
      side: THREE.DoubleSide,
    }),
    floor: new THREE.MeshStandardMaterial({
      map: floorColor,
      normalMap: floorNormal,
      roughnessMap: floorRoughness,
      envMapIntensity: FLOOR_ENV_INTENSITY,
    }),
    frame: new THREE.MeshStandardMaterial({
      map: frameColor,
      normalMap: frameNormal,
      roughnessMap: frameRoughness,
      envMapIntensity: ROOM_ENV_INTENSITY,
    }),
    // Ligeramente por encima del suelo, no al ras: evita el parpadeo por
    // z-fighting entre las dos superficies (ver `buildPath`).
    path: new THREE.MeshStandardMaterial({
      map: pathColor,
      normalMap: pathNormal,
      roughnessMap: pathRoughness,
      envMapIntensity: FLOOR_ENV_INTENSITY,
    }),
    // Sin textura propia: es una carcasa metálica lisa, no hace falta un mapa
    // PBR dedicado. El emissive tenue sugiere que es ella la que da la luz.
    fixture: new THREE.MeshStandardMaterial({
      color: "#2a2a2a",
      metalness: 0.6,
      roughness: 0.35,
      emissive: "#fff4e2",
      emissiveIntensity: 0.15,
      envMapIntensity: ROOM_ENV_INTENSITY,
    }),
  };

  return { materials, disposables };
}

/** Multiplica las UV de una geometría: no se puede tilear por `.repeat` de
 * la textura porque la comparten segmentos de anchos distintos. */
function scaleUVs(geometry: THREE.BufferGeometry, repeatX: number, repeatY: number): void {
  const uv = geometry.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * repeatX, uv.getY(i) * repeatY);
  }
  uv.needsUpdate = true;
}

function wallSegmentMesh(width: number, height: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  scaleUVs(geometry, width / WALL_TILE_METERS, height / WALL_TILE_METERS);
  return new THREE.Mesh(geometry, material);
}

export type FloorPlanHandle = {
  dispose: () => void;
};

/**
 * La estructura completa del museo: paredes (con hueco donde hay sala
 * vecina) y un único suelo que cubre todas las salas. Se construye una sola
 * vez; su `dispose` solo se llama al desmontar el componente entero.
 *
 * Qué pared es maciza y cuál lleva hueco lo decide `wallSegments`
 * (`floor-plan.ts`), no este fichero — es la misma geometría que usa la
 * colisión del movimiento en primera persona, y no pueden desincronizarse.
 */
export function buildFloorPlan(
  scene: THREE.Scene,
  materials: RoomMaterials,
  placements: Placement[],
): FloorPlanHandle {
  const objects: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const wallHeight = WALL_HEIGHT + WALL_EXTRA_HEIGHT;

  for (const segment of wallSegments(placements)) {
    const alongX = segment.z1 === segment.z2;
    const length = alongX ? Math.abs(segment.x2 - segment.x1) : Math.abs(segment.z2 - segment.z1);
    const mesh = wallSegmentMesh(length, wallHeight, materials.wall);
    if (alongX) {
      mesh.position.set((segment.x1 + segment.x2) / 2, wallHeight / 2, segment.z1);
    } else {
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(segment.x1, wallHeight / 2, (segment.z1 + segment.z2) / 2);
    }
    scene.add(mesh);
    objects.push(mesh);
    geometries.push(mesh.geometry);
  }

  const bounds = planBounds(placements);
  const floorWidth = bounds.maxX - bounds.minX;
  const floorDepth = bounds.maxZ - bounds.minZ;
  const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth);
  scaleUVs(floorGeometry, floorWidth / FLOOR_TILE_METERS, floorDepth / FLOOR_TILE_METERS);
  const floor = new THREE.Mesh(floorGeometry, materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  scene.add(floor);
  objects.push(floor);
  geometries.push(floorGeometry);

  return {
    dispose() {
      for (const object of objects) scene.remove(object);
      for (const geometry of geometries) geometry.dispose();
    },
  };
}

/**
 * El camino de piedra: un pasillo central en cada sala —de puerta a
 * puerta, porque las salas de una misma columna comparten centro en X— un
 * tramo perpendicular frente a los cuadros marcando la zona de visita, y un
 * tramo lateral hacia cada vecina este/oeste, cruzando su puerta compartida.
 * Va ligeramente por encima del suelo, no clavado en él (ver `materials.path`
 * en `createRoomMaterials`).
 *
 * El tramo lateral no sale del centro de la sala: arranca donde termina el
 * pasillo central (`center.x ± PATH_WIDTH / 2`) y llega hasta la pared
 * compartida (`center.x ± width / 2`, la misma coordenada que calcula
 * `wallSegments` para esa pared). Cada sala solo construye su propio lado —la
 * vecina construye el suyo cuando le toque—, y los dos tramos se tocan
 * justo en la pared sin solaparse: la misma idea que ya evita el
 * z-fighting entre el pasillo central y la tira frente a los cuadros, ahora
 * en la dirección perpendicular.
 */
export function buildPath(
  scene: THREE.Scene,
  materials: RoomMaterials,
  placements: Placement[],
): FloorPlanHandle {
  const objects: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  function addStrip(centerX: number, centerZ: number, width: number, depth: number) {
    const geometry = new THREE.PlaneGeometry(width, depth);
    scaleUVs(geometry, width / PATH_TILE_METERS, depth / PATH_TILE_METERS);
    const mesh = new THREE.Mesh(geometry, materials.path);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(centerX, 0.004, centerZ);
    scene.add(mesh);
    objects.push(mesh);
    geometries.push(geometry);
  }

  for (const placement of placements) {
    const sign = facingSign(placement.facing);
    const { art: artZ, entrance: entranceZ } = roomWallZ(placement);

    // El pasillo para justo donde empieza la zona de visita, no se mete
    // dentro: dos tiras coplanares solapadas parpadean (z-fighting) donde
    // se cruzan, aunque sean la misma textura.
    const viewingNearEdge = artZ + sign * (PATH_VIEWING_DISTANCE - PATH_WIDTH / 2);
    addStrip(
      placement.center.x,
      (entranceZ + viewingNearEdge) / 2,
      PATH_WIDTH,
      Math.abs(viewingNearEdge - entranceZ),
    );

    addStrip(placement.center.x, artZ + sign * PATH_VIEWING_DISTANCE, placement.width, PATH_WIDTH);

    // Tramo lateral hacia cada vecina que exista, cruzando la puerta este u
    // oeste. La puerta cae exactamente en `center.z` —`wallSegments` centra
    // ahí el hueco de la pared lateral—, que es donde ya pasa el pasillo
    // central: por eso el tramo lateral parte de su borde en vez de solapar.
    if (placement.neighbors.east !== undefined) {
      const eastX = placement.center.x + placement.width / 2;
      addStrip(
        (placement.center.x + PATH_WIDTH / 2 + eastX) / 2,
        placement.center.z,
        eastX - (placement.center.x + PATH_WIDTH / 2),
        PATH_WIDTH,
      );
    }
    if (placement.neighbors.west !== undefined) {
      const westX = placement.center.x - placement.width / 2;
      addStrip(
        (westX + placement.center.x - PATH_WIDTH / 2) / 2,
        placement.center.z,
        placement.center.x - PATH_WIDTH / 2 - westX,
        PATH_WIDTH,
      );
    }
  }

  return {
    dispose() {
      for (const object of objects) scene.remove(object);
      for (const geometry of geometries) geometry.dispose();
    },
  };
}

/** Un marco al que animar el resplandor según la distancia de la cámara —ver
 * `FRAME_GLOW_*` más arriba—. `position` es el centro del lienzo, no del
 * marco: es la misma referencia que ya usa el aplique para apuntar su luz. */
export type FrameGlowTarget = {
  material: THREE.MeshStandardMaterial;
  position: THREE.Vector3;
};

/**
 * Distancia de la cámara al lienzo a partir de la cual se enseña el detalle
 * real en vez de la foto general — bastante más cerca que donde para el
 * acercamiento automático al hacer clic (`Math.max(distanceFor(...), 1.4)`
 * en `Room3D.tsx`): hay que caminar más allá de esa vista para pedirlo, no
 * es lo primero que se ve al enfocar una obra.
 */
const MAGNIFIER_DISTANCE = 0.9;

export type RoomPaintingsHandle = {
  /** Para el raycaster: qué índice de `placement.room.hung` es cada lienzo. */
  indexOfMesh: Map<THREE.Object3D, number>;
  /** Un marco por obra, para el resplandor al acercarse (`Room3D.tsx` lo
   * actualiza cada fotograma, no aquí: esto no sabe nada de la cámara). */
  glowTargets: FrameGlowTarget[];
  /** La lupa: qué lienzo enseña su foto de detalle según lo cerca que esté la
   * cámara. Se llama cada fotograma; solo hace algo el fotograma en que se
   * cruza el umbral, no en cada uno. */
  update: (camera: THREE.Camera) => void;
  dispose: () => void;
};

/**
 * Marcos, lienzos y focos de una sala, colocados en el mundo según su
 * `placement`. Es lo único que se reconstruye al cambiar de sala —la
 * estructura (paredes/suelo) ya está puesta por `buildFloorPlan`.
 */
export function buildRoomPaintings(
  scene: THREE.Scene,
  materials: RoomMaterials,
  placement: Placement,
  textureLoader: THREE.TextureLoader,
  renderer: THREE.WebGLRenderer,
  onPaintingLoad: () => void,
): RoomPaintingsHandle {
  const objects: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const indexOfMesh = new Map<THREE.Object3D, number>();
  const glowTargets: FrameGlowTarget[] = [];
  const magnifiers: Array<{
    position: THREE.Vector3;
    material: THREE.MeshStandardMaterial;
    coverTexture: THREE.Texture;
    detailUrl: string;
    detailTexture: THREE.Texture | null;
    showingDetail: boolean;
  }> = [];

  const sign = facingSign(placement.facing);
  const { art: artZ } = roomWallZ(placement);

  placement.room.hung.forEach((painting, index) => {
    const texture = textureLoader.load(painting.textureUrl, onPaintingLoad);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    disposables.push(texture);

    const worldX = placement.center.x + painting.x;

    // Material propio y no el compartido `materials.frame`: el resplandor al
    // acercarse es de esta obra, no de todas las de la sala a la vez. Clonar
    // reutiliza las mismas texturas (`map`/`normalMap`/`roughnessMap`), así
    // que no pesa más en descargas, solo un objeto Material más por cuadro.
    const frameMaterial = materials.frame.clone();
    frameMaterial.emissive = new THREE.Color(FRAME_GLOW_COLOR);
    frameMaterial.emissiveIntensity = 0;
    disposables.push(frameMaterial);

    const frameGeometry = new THREE.BoxGeometry(
      painting.width + FRAME_BORDER * 2,
      painting.height + FRAME_BORDER * 2,
      FRAME_DEPTH,
    );
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(worldX, painting.y, artZ + sign * (FRAME_DEPTH / 2));
    frame.rotation.y = placement.facing;
    scene.add(frame);
    objects.push(frame);
    geometries.push(frameGeometry);
    glowTargets.push({ material: frameMaterial, position: frame.position.clone() });

    const canvasMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      // Ver `PAINTING_BASE_EMISSIVE`: un suelo de luz con los propios colores
      // del cuadro, para que nunca dependa solo del aplique o del entorno.
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: PAINTING_BASE_EMISSIVE,
    });
    const canvasGeometry = new THREE.PlaneGeometry(painting.width, painting.height);
    const canvasMesh = new THREE.Mesh(canvasGeometry, canvasMaterial);
    canvasMesh.position.set(worldX, painting.y, artZ + sign * (FRAME_DEPTH + 0.001));
    canvasMesh.rotation.y = placement.facing;
    scene.add(canvasMesh);
    objects.push(canvasMesh);
    geometries.push(canvasGeometry);
    disposables.push(canvasMaterial);
    indexOfMesh.set(canvasMesh, index);

    // La lupa: si la obra tiene fotos de detalle generadas, se registra aquí
    // y `update()` decide cada fotograma si toca mostrarla — no se pide la
    // foto de detalle hasta que alguien se acerca de verdad (solo la primera,
    // ver `MAGNIFIER_DISTANCE`): la mayoría de visitas a la sala no llega a
    // pedir ni una.
    if (painting.detailUrls.length > 0) {
      magnifiers.push({
        position: canvasMesh.position.clone(),
        material: canvasMaterial,
        coverTexture: texture,
        detailUrl: painting.detailUrls[0]!,
        detailTexture: null,
        showingDetail: false,
      });
    }

    // La carcasa del aplique, montada en la pared justo encima del marco.
    const fixtureWidth = Math.max(painting.width * FIXTURE_WIDTH_RATIO, FIXTURE_MIN_WIDTH);
    const fixtureGeometry = new THREE.BoxGeometry(fixtureWidth, FIXTURE_HEIGHT, FIXTURE_DEPTH);
    const fixture = new THREE.Mesh(fixtureGeometry, materials.fixture);
    const fixtureY =
      painting.y + painting.height / 2 + FRAME_BORDER + FIXTURE_GAP_ABOVE_PAINTING + FIXTURE_HEIGHT / 2;
    fixture.position.set(worldX, fixtureY, artZ + sign * (FIXTURE_DEPTH / 2));
    fixture.rotation.y = placement.facing;
    scene.add(fixture);
    objects.push(fixture);
    geometries.push(fixtureGeometry);

    // La luz sale del borde delantero de la carcasa, como una barra ancha —
    // un `RectAreaLight`, no un foco puntual—. Con un solo punto, por mucho
    // que se abriera el cono, las esquinas de un cuadro ancho quedaban a
    // oscuras: el centro es lo más cercano a un aplique casi cenital, y la
    // luz cae con la distancia. Una barra del ancho del cuadro no tiene ese
    // problema porque ya nace ancha.
    const lightPosition = new THREE.Vector3(
      worldX,
      fixtureY - FIXTURE_HEIGHT / 2,
      artZ + sign * (FIXTURE_DEPTH - 0.02),
    );
    const lightWidth = painting.width * 0.85;
    const lightHeight = 0.1;
    // Una obra pequeña queda más cerca de su aplique que una grande —el
    // hueco encima del marco es el mismo para las dos—, así que a igual
    // intensidad saldría quemada. Se compensa apuntando a una misma
    // iluminación en el centro del lienzo, deshaciendo la caída por
    // distancia en vez de fijar una intensidad a ojo por cuadro.
    const lightDistance = lightPosition.distanceTo(canvasMesh.position);
    const light = new THREE.RectAreaLight("#fff4e2", 7 * lightDistance, lightWidth, lightHeight);
    light.position.copy(lightPosition);
    light.lookAt(canvasMesh.position);
    scene.add(light);
    objects.push(light);
  });

  function update(camera: THREE.Camera) {
    for (const magnifier of magnifiers) {
      const shouldShowDetail = camera.position.distanceTo(magnifier.position) < MAGNIFIER_DISTANCE;
      if (shouldShowDetail === magnifier.showingDetail) continue;
      magnifier.showingDetail = shouldShowDetail;

      if (shouldShowDetail && !magnifier.detailTexture) {
        const detail = textureLoader.load(magnifier.detailUrl);
        detail.colorSpace = THREE.SRGBColorSpace;
        detail.anisotropy = renderer.capabilities.getMaxAnisotropy();
        disposables.push(detail);
        magnifier.detailTexture = detail;
      }

      const nextMap = shouldShowDetail ? magnifier.detailTexture : magnifier.coverTexture;
      magnifier.material.map = nextMap;
      magnifier.material.emissiveMap = nextMap;
      magnifier.material.needsUpdate = true;
    }
  }

  return {
    indexOfMesh,
    glowTargets,
    update,
    dispose() {
      for (const object of objects) scene.remove(object);
      for (const geometry of geometries) geometry.dispose();
      for (const disposable of disposables) disposable.dispose();
    },
  };
}

/** La familia del titular del sitio (Cormorant Garamond, autoalojada por
 * `next/font`), resuelta a través de un elemento real —el nombre final que
 * genera `next/font` no está en ningún sitio fijo, y solo `getComputedStyle`
 * lo resuelve—. Con "Georgia" de reserva si por lo que sea no hay clase
 * `.display` cargada en la página. */
function displayFontFamily(): string {
  const probe = document.createElement("span");
  probe.className = "display";
  probe.style.position = "fixed";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  document.body.removeChild(probe);
  return family || "Georgia, serif";
}

/** Dibuja solo el texto, en un canvas del tamaño justo para él —con relleno
 * fijo alrededor, no una caja de tamaño fijo con el texto encogido dentro—.
 * La placa en sí ya no se dibuja aquí: es geometría de verdad, con relieve
 * propio (ver `buildRoomLabel`). El texto lleva un relieve tallado a mano —
 * una sombra oscura y un filo claro, desplazados en direcciones opuestas—
 * porque no hay presupuesto para extruir cada letra en 3D por un cartel de
 * pared. */
function drawSignCanvas(canvas: HTMLCanvasElement, text: string, fontFamily: string): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;

  const font = `500 ${SIGN_FONT_SIZE_PX}px ${fontFamily}`;
  function applyFont() {
    ctx.font = font;
    // No todos los navegadores lo soportan todavía (Safari < 17): sin él,
    // el texto sale con el tracking normal, no rota.
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${SIGN_LETTER_SPACING_PX}px`;
  }
  applyFont();
  const textWidth = ctx.measureText(text).width;
  canvas.width = Math.ceil(textWidth + SIGN_PADDING_X_PX * 2);
  canvas.height = Math.ceil(SIGN_FONT_SIZE_PX + SIGN_PADDING_Y_PX * 2);
  // Cambiar el tamaño del canvas resetea el contexto: hay que refijar la
  // fuente y las alineaciones después.
  applyFont();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + canvas.height * 0.02;
  ctx.fillStyle = "rgba(26, 23, 20, 0.35)";
  ctx.fillText(text, cx + 1.4, cy + 1.4);
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(text, cx - 1, cy - 1);
  ctx.fillStyle = SIGN_INK;
  ctx.fillText(text, cx, cy);
}

export type RoomLabelHandle = {
  dispose: () => void;
};

/**
 * El cartel con el nombre de la serie, en la pared de la obra, por encima de
 * todos sus apliques —para saber en qué sala se está sin mirar las pastillas
 * de arriba. Una placa por sala, como los cuadros y los focos: se llama una
 * vez por `placement`.
 */
export function buildRoomLabel(
  scene: THREE.Scene,
  placement: Placement,
  renderer: THREE.WebGLRenderer,
): RoomLabelHandle {
  const canvas = document.createElement("canvas");
  drawSignCanvas(canvas, placement.room.title, displayFontFamily());

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const worldWidth = canvas.width / SIGN_PIXELS_PER_METER;
  const worldHeight = canvas.height / SIGN_PIXELS_PER_METER;

  const sign = facingSign(placement.facing);
  const { art: artZ } = roomWallZ(placement);
  // Por encima del aplique más alto de la sala, no de un número fijo: una
  // sala con obras grandes lleva los focos más arriba, y el cartel tiene que
  // seguir despejándolos a todos.
  const maxFixtureTop = placement.room.hung.reduce(
    (max, painting) =>
      Math.max(
        max,
        painting.y + painting.height / 2 + FRAME_BORDER + FIXTURE_GAP_ABOVE_PAINTING + FIXTURE_HEIGHT,
      ),
    EYE_LEVEL,
  );
  const minY = maxFixtureTop + SIGN_MIN_GAP_ABOVE_FIXTURES + worldHeight / 2;
  const y = Math.min(Math.max(SIGN_PREFERRED_Y, minY), WALL_HEIGHT - 0.3);

  // La placa: una caja de bordes redondeados, no un plano — su relieve sale
  // de que es geometría de verdad, con caras que la luz de la sala sombrea.
  const plaqueGeometry = new RoundedBoxGeometry(worldWidth, worldHeight, SIGN_DEPTH, 3, SIGN_CORNER_RADIUS);
  const plaqueMaterial = new THREE.MeshStandardMaterial({
    color: SIGN_PLAQUE_COLOR,
    roughness: 0.55,
    metalness: 0.05,
    envMapIntensity: ROOM_ENV_INTENSITY,
  });
  const plaque = new THREE.Mesh(plaqueGeometry, plaqueMaterial);
  plaque.position.set(placement.center.x, y, artZ + sign * (SIGN_DEPTH / 2));
  plaque.rotation.y = placement.facing;
  scene.add(plaque);

  // El texto, pegado a la cara delantera. Sin tonemapping: tiene que leerse
  // siempre igual de nítido, no oscurecerse con la exposición de la escena
  // como la propia placa (eso sí lo tiene que hacer, es lo que le da cuerpo).
  const textGeometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
  const textMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(placement.center.x, y, artZ + sign * (SIGN_DEPTH + 0.001));
  textMesh.rotation.y = placement.facing;
  scene.add(textMesh);

  return {
    dispose() {
      scene.remove(plaque);
      scene.remove(textMesh);
      plaqueGeometry.dispose();
      plaqueMaterial.dispose();
      textGeometry.dispose();
      textMaterial.dispose();
      texture.dispose();
    },
  };
}

export type FloorFlowersHandle = {
  dispose: () => void;
};

/**
 * Margaritas sueltas por el suelo de todas las salas, de una vez —como los
 * cuadros y los carteles, nada que sembrar de nuevo al moverse—.
 *
 * Una `InstancedMesh` por celda del atlas (6 en total, compartidas entre
 * salas): así cientos de flores no cuestan cientos de objetos ni de
 * `draw calls`, solo una matriz más por instancia.
 */
export function buildFloorFlowers(
  scene: THREE.Scene,
  textureLoader: THREE.TextureLoader,
  placements: Placement[],
  renderer: THREE.WebGLRenderer,
  onLoad: () => void,
): FloorFlowersHandle {
  const baseTexture = textureLoader.load(FLOWER_DECAL_TEXTURE, onLoad);
  baseTexture.colorSpace = THREE.SRGBColorSpace;
  baseTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Nace plana en el suelo (XZ, cara hacia arriba): así cada instancia solo
  // tiene que decidir posición, giro y tamaño, no también tumbarla.
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);

  const objects: THREE.Object3D[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  const dummy = new THREE.Object3D();
  const cells = FLOWER_ATLAS_COLS * FLOWER_ATLAS_ROWS;

  for (const placement of placements) {
    const area = placement.width * ROOM_DEPTH;
    const count = Math.min(Math.round(area * FLOWER_DENSITY), FLOWER_MAX_PER_ROOM);
    if (count === 0) continue;

    // Reparte el recuento entre las celdas del atlas casi por igual, en vez
    // de sortear la celda flor a flor: así cada celda sale con una única
    // `InstancedMesh` de tamaño fijo, sin listas dinámicas.
    const perCell = new Array<number>(cells).fill(0);
    for (let i = 0; i < count; i++) perCell[i % cells]!++;

    const { art: artZ, entrance: entranceZ } = roomWallZ(placement);
    const minZ = Math.min(artZ, entranceZ) + FLOWER_WALL_MARGIN;
    const maxZ = Math.max(artZ, entranceZ) - FLOWER_WALL_MARGIN;
    const minX = placement.center.x - placement.width / 2 + FLOWER_WALL_MARGIN;
    const maxX = placement.center.x + placement.width / 2 - FLOWER_WALL_MARGIN;

    perCell.forEach((instances, cell) => {
      if (instances === 0) return;
      const col = cell % FLOWER_ATLAS_COLS;
      const row = Math.floor(cell / FLOWER_ATLAS_COLS);

      const texture = baseTexture.clone();
      texture.needsUpdate = true;
      texture.repeat.set(1 / FLOWER_ATLAS_COLS, 1 / FLOWER_ATLAS_ROWS);
      texture.offset.set(col / FLOWER_ATLAS_COLS, row / FLOWER_ATLAS_ROWS);
      disposables.push(texture);

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        alphaTest: 0.5,
        roughness: 0.85,
        envMapIntensity: ROOM_ENV_INTENSITY,
      });
      disposables.push(material);

      const mesh = new THREE.InstancedMesh(geometry, material, instances);
      for (let i = 0; i < instances; i++) {
        const size = FLOWER_MIN_SIZE + Math.random() * (FLOWER_MAX_SIZE - FLOWER_MIN_SIZE);
        dummy.position.set(
          minX + Math.random() * (maxX - minX),
          0.003,
          minZ + Math.random() * (maxZ - minZ),
        );
        dummy.rotation.set(
          (Math.random() - 0.5) * FLOWER_MAX_TILT,
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * FLOWER_MAX_TILT,
        );
        dummy.scale.setScalar(size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      scene.add(mesh);
      objects.push(mesh);
    });
  }

  return {
    dispose() {
      for (const object of objects) scene.remove(object);
      geometry.dispose();
      baseTexture.dispose();
      for (const disposable of disposables) disposable.dispose();
    },
  };
}

export type FloorFoliageHandle = {
  dispose: () => void;
};

/**
 * Hojas de césped sueltas por el suelo de todas las salas, en matas de 2 a 6
 * —no una a una—, más concentradas junto a las paredes.
 *
 * Todas las matas de todas las salas se agrupan en solo ocho
 * `InstancedMesh` —una por celda del atlas—, compartidas por el edificio
 * entero: cientos de hojas no cuestan cientos de objetos.
 */
export function buildFloorFoliage(
  scene: THREE.Scene,
  textureLoader: THREE.TextureLoader,
  placements: Placement[],
  renderer: THREE.WebGLRenderer,
  onLoad: () => void,
): FloorFoliageHandle {
  const baseTexture = textureLoader.load(FOLIAGE_DECAL_TEXTURE, onLoad);
  baseTexture.colorSpace = THREE.SRGBColorSpace;
  baseTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // El aspecto de una celda del atlas (ancho:alto), no un cuadrado: si no,
  // la hoja sale más ancha o más estrecha de lo que es de verdad.
  const cellAspect = FOLIAGE_ATLAS_ROWS / FOLIAGE_ATLAS_COLS;
  const geometry = new THREE.PlaneGeometry(cellAspect, 1);
  // Origen en la base, no en el centro: cada hoja se planta en el suelo, no
  // flota a mitad de su propia altura.
  geometry.translate(0, 0.5, 0);

  const cells = FOLIAGE_ATLAS_COLS * FOLIAGE_ATLAS_ROWS;
  const transformsByCell: THREE.Matrix4[][] = Array.from({ length: cells }, () => []);
  const dummy = new THREE.Object3D();
  // Inclinar primero sobre un eje horizontal fijo y girar ese resultado en Y
  // después: así la hoja se abre hacia un lado al azar sin poder tumbarse
  // hacia abajo —el eje de la inclinación nunca es el vertical—.
  const spreadAxis = new THREE.Vector3(1, 0, 0);
  const upAxis = new THREE.Vector3(0, 1, 0);
  const spreadQuat = new THREE.Quaternion();
  const azimuthQuat = new THREE.Quaternion();

  function placeBlade(x: number, z: number) {
    const cell = Math.floor(Math.random() * cells);
    const height = FOLIAGE_BLADE_MIN_HEIGHT + Math.random() * (FOLIAGE_BLADE_MAX_HEIGHT - FOLIAGE_BLADE_MIN_HEIGHT);
    spreadQuat.setFromAxisAngle(spreadAxis, Math.random() * FOLIAGE_MAX_SPREAD);
    azimuthQuat.setFromAxisAngle(upAxis, Math.random() * Math.PI * 2);
    dummy.position.set(x, 0.002, z);
    dummy.quaternion.copy(azimuthQuat).multiply(spreadQuat);
    dummy.scale.set(height, height, 1);
    dummy.updateMatrix();
    transformsByCell[cell]!.push(dummy.matrix.clone());
  }

  // Rechazo simple: cerca de una pared, la mata entra siempre; lejos, solo
  // una de cada ocho — de ahí sale la concentración sin dejar el resto de
  // la sala pelado. `attempts` acotado: si nunca acepta, la última
  // candidata vale igual, no hace falta reintentar sin límite.
  function sampleTuftCenter(minX: number, maxX: number, minZ: number, maxZ: number) {
    let x = minX;
    let z = minZ;
    for (let attempt = 0; attempt < 6; attempt++) {
      x = minX + Math.random() * (maxX - minX);
      z = minZ + Math.random() * (maxZ - minZ);
      const distToWall = Math.min(x - minX, maxX - x, z - minZ, maxZ - z);
      if (distToWall < FOLIAGE_WALL_BAND || Math.random() < FOLIAGE_FAR_ACCEPT_CHANCE) break;
    }
    return { x, z };
  }

  for (const placement of placements) {
    const area = placement.width * ROOM_DEPTH;
    const tuftCount = Math.min(Math.round(area * FOLIAGE_TUFT_DENSITY), FOLIAGE_MAX_TUFTS_PER_ROOM);
    if (tuftCount === 0) continue;

    const { art: artZ, entrance: entranceZ } = roomWallZ(placement);
    const minZ = Math.min(artZ, entranceZ) + FOLIAGE_WALL_MARGIN;
    const maxZ = Math.max(artZ, entranceZ) - FOLIAGE_WALL_MARGIN;
    const minX = placement.center.x - placement.width / 2 + FOLIAGE_WALL_MARGIN;
    const maxX = placement.center.x + placement.width / 2 - FOLIAGE_WALL_MARGIN;

    for (let i = 0; i < tuftCount; i++) {
      const { x, z } = sampleTuftCenter(minX, maxX, minZ, maxZ);
      const bladeCount = FOLIAGE_TUFT_COUNTS[Math.floor(Math.random() * FOLIAGE_TUFT_COUNTS.length)]!;
      // Mismo punto de anclaje para toda la mata: lo que varía por hoja es
      // hacia dónde se abre, no dónde nace.
      for (let b = 0; b < bladeCount; b++) placeBlade(x, z);
    }
  }

  const objects: THREE.Object3D[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  transformsByCell.forEach((matrices, cell) => {
    if (matrices.length === 0) return;
    const col = cell % FOLIAGE_ATLAS_COLS;
    const row = Math.floor(cell / FOLIAGE_ATLAS_COLS);

    const texture = baseTexture.clone();
    texture.needsUpdate = true;
    texture.repeat.set(1 / FOLIAGE_ATLAS_COLS, 1 / FOLIAGE_ATLAS_ROWS);
    texture.offset.set(col / FOLIAGE_ATLAS_COLS, row / FOLIAGE_ATLAS_ROWS);
    disposables.push(texture);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      alphaTest: 0.5,
      // Una hoja de pie se ve desde cualquier lado según hacia dónde le
      // tocó girar: con una sola cara, la mitad de las veces sería invisible.
      side: THREE.DoubleSide,
      roughness: 0.75,
      envMapIntensity: ROOM_ENV_INTENSITY,
    });
    disposables.push(material);

    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    scene.add(mesh);
    objects.push(mesh);
  });

  return {
    dispose() {
      for (const object of objects) scene.remove(object);
      geometry.dispose();
      baseTexture.dispose();
      for (const disposable of disposables) disposable.dispose();
    },
  };
}

export type CornerTreesHandle = {
  dispose: () => void;
};

/**
 * Un árbol por cada cruce entre columnas que tenga sentido (ver
 * `treeSpots` en `floor-plan.ts`). Si el plano no tiene ninguno —una sola
 * columna— no carga nada.
 *
 * El `.fbx` trae sus propios materiales por nombre —los mismos tres del
 * `.mtl` original—, pero apuntando a las texturas de fábrica sin optimizar;
 * aquí se sustituyen enteros por materiales propios con las versiones webp,
 * en cuanto termina de cargar el modelo. Se carga una única vez y se clona
 * por cada cruce —los clones comparten geometría y materiales, tres.js solo
 * copia la jerarquía y las transformaciones—.
 */
export function buildCornerTrees(
  scene: THREE.Scene,
  placements: Placement[],
  fbxLoader: FBXLoader,
  textureLoader: THREE.TextureLoader,
  renderer: THREE.WebGLRenderer,
  onLoad: () => void,
): CornerTreesHandle {
  const spots = treeSpots(placements);
  if (spots.length === 0) return { dispose() {} };

  const disposables: Array<{ dispose: () => void }> = [];
  const roots: THREE.Object3D[] = [];

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  function loadTexture(path: string, colorMap: boolean): THREE.Texture {
    const texture = textureLoader.load(path);
    texture.anisotropy = anisotropy;
    if (colorMap) texture.colorSpace = THREE.SRGBColorSpace;
    disposables.push(texture);
    return texture;
  }

  const trunkMaterial = new THREE.MeshStandardMaterial({
    map: loadTexture(`${TREE_TRUNK_TEXTURE}-color.webp`, true),
    normalMap: loadTexture(`${TREE_TRUNK_TEXTURE}-normal.webp`, false),
    roughness: 0.9,
    envMapIntensity: ROOM_ENV_INTENSITY,
  });
  disposables.push(trunkMaterial);

  // El follaje recorta su silueta por alpha —el color trae canal alfa, el
  // mismo que el `.mtl` original usaba como `map_d`—, así que va
  // `DoubleSide`: una hoja sin grosor propio se ve por detrás igual que por
  // delante.
  const foliageMaterial = new THREE.MeshStandardMaterial({
    map: loadTexture(`${TREE_FOLIAGE_TEXTURE}-color.webp`, true),
    normalMap: loadTexture(`${TREE_FOLIAGE_TEXTURE}-normal.webp`, false),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.85,
    envMapIntensity: ROOM_ENV_INTENSITY,
  });
  disposables.push(foliageMaterial);

  function pickMaterial(name: string): THREE.Material {
    return name === "Bark" ? trunkMaterial : foliageMaterial;
  }

  fbxLoader.load(TREE_MODEL, (fbx) => {
    fbx.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const original = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of original) material.dispose();
      child.material = Array.isArray(child.material)
        ? original.map((material) => pickMaterial(material.name))
        : pickMaterial(original[0]!.name);
    });
    fbx.scale.setScalar(TREE_SCALE);

    for (const spot of spots) {
      // `clone(true)` copia la jerarquía y las transformaciones; geometría y
      // materiales quedan compartidos por referencia con el original.
      const instance = fbx.clone(true);
      instance.position.set(spot.x, TREE_GROUND_OFFSET, spot.z);
      scene.add(instance);
      roots.push(instance);
    }
    onLoad();
  });

  return {
    dispose() {
      for (const root of roots) scene.remove(root);
      for (const disposable of disposables) disposable.dispose();
    },
  };
}

/** Altura de vuelo: bastante por encima de la pared para leerse contra el
 * cielo, nunca contra el edificio. */
const BIRD_HEIGHT = WALL_HEIGHT * 2.4;
/** Envergadura del sprite, en metros de mundo — a esta altura y distancia,
 * más grande empezaría a leerse como un objeto y no como un pájaro lejano. */
const BIRD_SIZE = 1.3;
/** Segundos que tarda la bandada en cruzar de un lado al otro del plano y
 * volver a empezar. Largo a propósito: se cruza con el cielo «de vez en
 * cuando», no en bucle evidente cada pocos segundos. */
const BIRD_PERIOD_S = 140;
/** Cuánto se sale la bandada más allá del propio plano del museo, a cada
 * lado del recorrido — para que entre y salga del campo de visión en vez de
 * aparecer o desaparecer de golpe justo sobre el edificio. */
const BIRD_MARGIN = 30;

/**
 * Silueta de pájaro —dos trazos en "M", el gesto mínimo que se lee como ave
 * en vuelo— dibujada en un canvas 2D, no un modelo 3D: el TODO es explícito
 * en que no busca fotorrealismo, y una silueta así de lejos es justo lo que
 * se ve a simple vista de un pájaro real.
 *
 * Se dibuja en blanco puro y no en un color fijo: es una máscara de alfa, y
 * el color de verdad lo pone `material.color` según el tema (ver
 * `BIRD_COLOR_BY_THEME`). Un trazo oscuro fijo desaparecía sin remedio contra
 * el cielo nocturno —negro sobre casi negro—, que es justo cuando más
 * apliques y menos luz de relleno hay en la sala.
 */
function drawBirdSilhouette(): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = size * 0.1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(size * 0.04, size * 0.38);
  ctx.quadraticCurveTo(size * 0.28, size * 0.04, size * 0.5, size * 0.34);
  ctx.quadraticCurveTo(size * 0.72, size * 0.04, size * 0.96, size * 0.38);
  ctx.stroke();
  return canvas;
}

/** De día se lee como silueta oscura contra el cielo claro; de noche, como
 * un gris pálido contra el negro — ni blanco puro (leería como estrella
 * grande), ni oscuro (se perdería del todo). */
const BIRD_COLOR_BY_THEME = { light: "#1a1714", dark: "#9c9488" } as const;

export type BirdFlockHandle = {
  /** Se llama una vez por fotograma, con los segundos desde que se montó la
   * sala —no falta de tiempo real, la posición es una función pura de él—. */
  update: (elapsedSeconds: number) => void;
  /** El mismo interruptor claro/oscuro que cambia el cielo: sin esto, la
   * bandada seguiría con el color del tema con el que se montó la sala. */
  setTheme: (theme: "light" | "dark") => void;
  dispose: () => void;
};

/**
 * Una bandada pequeña que cruza el cielo en diagonal, en un vaivén continuo
 * de extremo a extremo del plano del museo —no un bucle circular, que a esta
 * escala se leería como un dron dando vueltas—. Cada pájaro es un
 * `THREE.Sprite`: siempre de cara a la cámara, sin normales que iluminar ni
 * geometría que orientar, lo justo para una silueta a esta distancia.
 *
 * Formación fija y no aleatoria en cada montaje: una V suave, con pequeños
 * desfases de tiempo y altura para que no vuelen todos pegados como un solo
 * bloque, pero siempre la misma bandada — nada que no se pueda volver a ver
 * igual si se recarga la página.
 */
const BIRD_OFFSETS: ReadonlyArray<{ along: number; side: number; height: number }> = [
  { along: 0, side: 0, height: 0 },
  { along: -1.2, side: 1.4, height: 0.3 },
  { along: -1.2, side: -1.4, height: -0.2 },
  { along: -2.6, side: 2.8, height: 0.5 },
  { along: -2.6, side: -2.8, height: -0.1 },
  { along: -4, side: 4.2, height: 0.2 },
];

export function buildBirdFlock(scene: THREE.Scene, placements: Placement[]): BirdFlockHandle {
  const bounds = planBounds(placements);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  // Vuelo en diagonal sobre la diagonal más larga del plano, con margen a
  // cada lado: en un museo de una sola sala eso ya cruza de sobra el campo de
  // visión; en uno grande, cruza el edificio entero.
  const halfSpan = Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2 + BIRD_MARGIN;

  const texture = new THREE.CanvasTexture(drawBirdSilhouette());
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    // Silueta plana, no un material iluminado: un pájaro tan lejano no
    // recibe sombreado visible, solo se recorta contra el cielo.
    toneMapped: false,
  });

  const sprites = BIRD_OFFSETS.map((offset) => {
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(BIRD_SIZE);
    scene.add(sprite);
    return { sprite, offset };
  });

  return {
    update(elapsedSeconds) {
      // Vaivén 0→1→0 con `triangle wave`, no un `%` a secas: así la bandada
      // frena, da media vuelta y vuelve, en vez de saltar de un extremo al
      // otro de golpe cada vez que se cumple el periodo.
      const phase = (elapsedSeconds / BIRD_PERIOD_S) % 1;
      const t = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      const along = -halfSpan + t * (halfSpan * 2);
      // Diagonal a 45°: cruza tanto en X como en Z, para verse igual desde
      // cualquier sala del edificio, no solo desde las que dan a un eje.
      const dirX = Math.SQRT1_2;
      const dirZ = Math.SQRT1_2;
      const sideX = -dirZ;
      const sideZ = dirX;

      for (const { sprite, offset } of sprites) {
        const a = along + offset.along;
        sprite.position.set(
          centerX + dirX * a + sideX * offset.side,
          BIRD_HEIGHT + offset.height,
          centerZ + dirZ * a + sideZ * offset.side,
        );
      }
    },
    setTheme(theme) {
      material.color.set(BIRD_COLOR_BY_THEME[theme]);
    },
    dispose() {
      for (const { sprite } of sprites) scene.remove(sprite);
      texture.dispose();
      material.dispose();
    },
  };
}
