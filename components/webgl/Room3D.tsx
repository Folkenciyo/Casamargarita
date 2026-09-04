"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import {
  buildCornerTrees,
  buildFloorFlowers,
  buildFloorFoliage,
  buildFloorPlan,
  buildPath,
  buildRoomLabel,
  buildRoomPaintings,
  createRoomMaterials,
} from "./build-room";
import {
  facingSign,
  layoutFloorPlan,
  planBounds,
  resolveCollision,
  ROOM_DEPTH,
  roomAt,
  roomWallZ,
  wallSegments,
  type Placement,
} from "./floor-plan";
import { buildRooms, EYE_LEVEL, WALL_HEIGHT, type RoomSection } from "./room-layout";

// Los apliques usan RectAreaLight —una luz con forma, no un punto— para que
// un cuadro ancho quede iluminado de un borde a otro. Necesita esta tabla de
// LTC calculada una sola vez, antes de crear ninguna: sin ella, la luz sale
// invisible.
RectAreaLightUniformsLib.init();

/** Ancho de pared que se ve al entrar, antes de fijarse en ninguna obra. */
const FRAMED_WIDTH = 6;
/** Acercamiento a una obra al hacer clic: un ajuste de encuadre corto, no
 * una forma de moverse por el museo —de eso se encarga WASD. */
const FOCUS_MS = 400;
/** Qué HDRI usar según el tema del sitio — el mismo interruptor claro/oscuro
 * de la cabecera, no un botón propio de la sala: quien nunca lo toca no
 * llega a verlo. */
const HDRI_BY_THEME = {
  light: "/Sala/day-sky-1k.exr",
  dark: "/Sala/night-sky-1k.exr",
} as const;
/** Las luces de relleno (ver más abajo) están pensadas para un cielo de día
 * — de noche hay que apagarlas casi del todo, si no la sala nunca se ve de
 * noche de verdad por mucho que cambie el HDRI. */
const FILL_BY_THEME = {
  light: { ambient: 0.3, directional: 0.6 },
  dark: { ambient: 0.04, directional: 0 },
} as const;

/** El tema activo, leído del `data-theme` que pone `ThemeToggle` en
 * `<html>` — la sala no tiene su propio estado de tema, sigue al del sitio. */
function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Metros por segundo caminando. */
const MOVE_SPEED = 3;
/** Radio de colisión: cuánto se acerca la cámara a una pared antes de que
 * la empuje hacia fuera. Bastante menor que `DOOR_WIDTH` (2 m) para pasar
 * de sobra por cualquier hueco de puerta. */
const COLLISION_RADIUS = 0.35;
/** Sensibilidad del arrastre del ratón, radianes por píxel. */
const LOOK_SENSITIVITY = 0.0035;
/** No se puede mirar del todo hacia arriba o hacia abajo. */
const MAX_PITCH = Math.PI * 0.42;

function pastilla(activo: boolean): string {
  return activo
    ? "rounded-full bg-[color:var(--color-ink)] px-3 py-1 text-sm text-[color:var(--color-canvas)]"
    : "rounded-full border border-[color:var(--color-canvas-dim)] px-3 py-1 text-sm transition-colors hover:border-[color:var(--color-oil)]";
}

/** Aceleración y frenado suaves para el acercamiento a una obra. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Interpola un ángulo por el camino más corto — de 170° a -170° son 20°,
 * no casi una vuelta entera. */
function lerpAngle(from: number, to: number, t: number): number {
  const twoPi = Math.PI * 2;
  let diff = ((to - from + Math.PI) % twoPi) - Math.PI;
  if (diff < -Math.PI) diff += twoPi;
  return from + diff * t;
}

/** El acercamiento a una obra: posición y hacia dónde mirar, en un tiempo
 * fijo, con aceleración y frenado suaves. */
type FocusTween = {
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromYaw: number;
  toYaw: number;
  fromPitch: number;
  toPitch: number;
  start: number;
};

/** Qué cuadro está enfocado o bajo el ratón: su sala y su índice dentro de
 * ella —hay cuadros de más de una sala a la vez, un índice suelto no basta
 * para identificar uno. */
type Hit = { placementIndex: number; paintingIndex: number };

/**
 * Sala virtual con three.js directo, sin react-three-fiber: la escena es
 * estática salvo la cámara, así que el reconciliador de React no aporta nada
 * y sí bastante peso.
 *
 * Todo el museo —paredes, suelo, huecos de puerta y los cuadros de todas
 * las salas— se construye entero al montar. Moverse es caminar de verdad:
 * WASD, con colisión contra las paredes macizas y paso libre por los huecos
 * de puerta; arrastrar el ratón gira la vista. Las pastillas de arriba
 * siguen saltando al instante a cualquier sala. Un minimapa en la esquina
 * sigue la posición y hacia dónde mira la cámara.
 */
export function Room3D({
  sections,
  initialSlug,
}: {
  sections: RoomSection[];
  initialSlug?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraMarkerRef = useRef<SVGGElement>(null);

  const rooms = useMemo(() => buildRooms(sections), [sections]);
  const placements = useMemo(() => layoutFloorPlan(rooms), [rooms]);
  const bounds = useMemo(() => planBounds(placements), [placements]);
  const [activeIndex, setActiveIndex] = useState(() => {
    const found = placements.findIndex((p) => p.room.slug === initialSlug);
    return found >= 0 ? found : 0;
  });
  const placement = placements[activeIndex] ?? placements[0]!;

  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState<Hit | null>(null);
  const [hovered, setHovered] = useState<Hit | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Puentes entre la UI de React y la escena de three, montada una sola vez.
  const focusPainting = useRef<((hit: Hit | null) => void) | null>(null);
  const enterRoom = useRef<((placement: Placement) => void) | null>(null);

  const step = useCallback(
    (delta: number) => {
      setFocused((current) => {
        const hung = placement.room.hung;
        if (hung.length === 0) return null;
        const from = current?.placementIndex === activeIndex ? current.paintingIndex : null;
        const next = from === null ? (delta > 0 ? 0 : hung.length - 1) : (from + delta + hung.length) % hung.length;
        return { placementIndex: activeIndex, paintingIndex: next };
      });
    },
    [activeIndex, placement.room.hung],
  );

  const selectRoom = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      const target = placements[index];
      if (!target) return;
      // Salto directo, imperativo: no depende de un efecto sobre
      // `activeIndex`, porque ese mismo estado también cambia solo al
      // cruzar una puerta andando (lo detecta `roomAt` en el bucle de
      // render) — si el salto colgara de ahí, cruzar una puerta te
      // devolvería de un tirón a la vista general de la sala nueva.
      enterRoom.current?.(target);
      setActiveIndex(index);
      setFocused(null);
      const qs = index !== 0 ? `?serie=${target.room.slug}` : "";
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [activeIndex, pathname, placements, router],
  );

  const toggleFullscreen = useCallback(() => {
    // El navegador puede negar la pantalla completa (política del sitio,
    // extensión, gesto de usuario no reconocido): sin capturarlo, queda una
    // promesa rechazada sin manejar.
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : stageRef.current?.requestFullscreen();
    request?.catch((error: unknown) => {
      console.error("sala 3D: pantalla completa no disponible", error);
    });
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // ---- Montaje: escena, cámara, renderer, museo entero, movimiento -------
  // Se crea una sola vez —`placements` no cambia en la práctica una vez
  // montada la página—.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || placements.length === 0) return;

    const scene = new THREE.Scene();
    // Negro mientras carga el HDRI: por encima de las paredes no hay techo, y
    // ese hueco se veía gris con el crema de antes. En cuanto llega el HDRI
    // se sustituye por el propio cielo — ver más abajo.
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );
    // Guiñada primero, luego cabeceo: la convención habitual de cámara en
    // primera persona, sin efectos raros al mirar hacia los lados.
    camera.rotation.order = "YXZ";

    /** Distancia a la que un ancho dado llena el encuadre. */
    function distanceFor(width: number) {
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const forWidth = width / 2 / Math.tan(hFov / 2);
      const forHeight = (WALL_HEIGHT * 0.9) / 2 / Math.tan(vFov / 2);
      return Math.max(forWidth, forHeight) * 1.05;
    }

    /** Dónde plantarse para ver de golpe la pared del cuadro de una sala. */
    function generalViewPosition(p: Placement): THREE.Vector3 {
      const sign = facingSign(p.facing);
      const { art: wallZ } = roomWallZ(p);
      const distance = distanceFor(Math.min(p.width, FRAMED_WIDTH));
      return new THREE.Vector3(p.center.x, EYE_LEVEL, wallZ + sign * distance);
    }

    // Guiñada y cabeceo de la cámara: 0 = mirando hacia -Z (como `facing`
    // de la fila 0), y coinciden con ese mismo número por diseño — no hace
    // falta convertir nada al plantar la cámara en una sala.
    let yaw = 0;
    let pitch = 0;
    function applyRotation() {
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }

    // Posición provisional: la corrige `enterRoom` en cuanto se monta la
    // primera sala, un instante después.
    camera.position.set(0, EYE_LEVEL, distanceFor(FRAMED_WIDTH));
    applyRotation();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (error) {
      console.error("sala 3D: WebGL no disponible", error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    // Sin esto, un entorno HDR de verdad quema de blanco los materiales
    // claros (la pared, el marco): sale plano, no como una sala iluminada.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    mount.appendChild(renderer.domElement);

    // Un único gestor de carga para el HDRI, las texturas PBR y los cuadros
    // de todas las salas: en cuanto termina todo lo que se le pida, se
    // quita el indicador de carga.
    const manager = new THREE.LoadingManager();
    manager.onLoad = () => setLoading(false);
    const textureLoader = new THREE.TextureLoader(manager);
    const fbxLoader = new FBXLoader(manager);

    // Luz de entorno: un HDRI de cielo real, convertido a mapa de
    // reflejo/irradiancia. En cuanto llega, todo material PBR de la escena
    // —pared, suelo, marcos, hasta el lienzo de cada obra— la recibe solo con
    // poner `scene.environment`, sin tocarlos uno a uno. El mismo mapa vale
    // como `background` —three.js sabe mostrarlo como un cielo, no solo
    // usarlo para iluminar—: por encima de las paredes, sin techo, se ve el
    // cielo en vez del negro liso de antes.
    //
    // `pmrem` se reutiliza entre el HDRI de día y el de noche —no se libera
    // hasta desmontar la sala— porque cambiar de tema no recarga la página,
    // solo pide otro equirectangular.
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    let envMap: THREE.Texture | null = null;
    function applyHdri(path: string, loader: EXRLoader) {
      loader.load(path, (hdri) => {
        const nextEnvMap = pmrem.fromEquirectangular(hdri).texture;
        hdri.dispose();
        scene.environment = nextEnvMap;
        scene.background = nextEnvMap;
        envMap?.dispose();
        envMap = nextEnvMap;
        renderer.render(scene, camera);
      });
    }

    // Antes de que hubiera un HDRI de entorno, estas luces tenían que hacerlo
    // todo ellas solas: con `scene.environment` puesto, la misma intensidad
    // quemaba de blanco la pared clara de día. De noche casi se apagan del
    // todo —si no, la sala nunca se ve realmente a oscuras por mucho que
    // cambie el HDRI— y quedan los apliques como protagonistas.
    const ambient = new THREE.AmbientLight("#ffffff", FILL_BY_THEME.light.ambient);
    scene.add(ambient);
    const fill = new THREE.DirectionalLight("#fff6e8", FILL_BY_THEME.light.directional);
    fill.position.set(0, 6, 8);
    scene.add(fill);

    // Primera carga: por el gestor común, para que el indicador de carga la
    // espere igual que a las texturas PBR y los cuadros.
    let theme = currentTheme();
    applyHdri(HDRI_BY_THEME[theme], new EXRLoader(manager));

    // El interruptor de tema no vive en la sala —lo pone `ThemeToggle` en la
    // cabecera del sitio—; esto solo escucha el aviso y cambia el HDRI y las
    // luces de relleno a juego, sin recargar nada más.
    function onThemeChange(event: Event) {
      const next = (event as CustomEvent<"light" | "dark">).detail;
      if (next === theme) return;
      theme = next;
      applyHdri(HDRI_BY_THEME[theme], new EXRLoader());
      ambient.intensity = FILL_BY_THEME[theme].ambient;
      fill.intensity = FILL_BY_THEME[theme].directional;
    }
    window.addEventListener("theme-change", onThemeChange);

    const { materials, disposables: materialDisposables } = createRoomMaterials(
      renderer,
      textureLoader,
      () => renderer.render(scene, camera),
    );

    // El edificio entero: paredes con hueco donde hay sala vecina, y un
    // único suelo.
    const floorPlan = buildFloorPlan(scene, materials, placements);
    // El camino de piedra, por encima del suelo.
    const path = buildPath(scene, materials, placements);
    // Las mismas paredes, como segmentos de recta: la colisión del
    // movimiento en primera persona choca contra esto, no contra las
    // mallas — es la misma fuente (`wallSegments`) que ya usó `buildFloorPlan`.
    const segments = wallSegments(placements);

    // Los cuadros de **todas** las salas, de una vez: nada que cargar ni
    // liberar al moverse. El raycaster junta los mapas de cada sala en uno
    // solo, con la sala de cada lienzo a mano.
    const paintingHandles = placements.map((p) =>
      buildRoomPaintings(scene, materials, p, textureLoader, renderer, () =>
        renderer.render(scene, camera),
      ),
    );
    // El cartel con el nombre de la serie, uno por sala.
    const labelHandles = placements.map((p) => buildRoomLabel(scene, p, renderer));
    // Margaritas y matas de hierba sueltas por el suelo, de todas las salas
    // a la vez.
    const floorFlowers = buildFloorFlowers(scene, textureLoader, placements, renderer, () =>
      renderer.render(scene, camera),
    );
    const floorFoliage = buildFloorFoliage(scene, textureLoader, placements, renderer, () =>
      renderer.render(scene, camera),
    );
    // Un árbol por cada cruce entre columnas que tenga sentido.
    const cornerTrees = buildCornerTrees(scene, placements, fbxLoader, textureLoader, renderer, () =>
      renderer.render(scene, camera),
    );
    const indexOfMesh = new Map<THREE.Object3D, Hit>();
    paintingHandles.forEach((handle, placementIndex) => {
      handle.indexOfMesh.forEach((paintingIndex, mesh) => {
        indexOfMesh.set(mesh, { placementIndex, paintingIndex });
      });
    });

    // ---- Acercamiento a una obra: un ajuste de encuadre corto, no vuelo --
    let tween: FocusTween | null = null;

    function startTween(toPosition: THREE.Vector3, toYaw: number, toPitch: number) {
      // Con la pestaña en segundo plano el navegador congela
      // requestAnimationFrame: se coloca la cámara ya, sin animar.
      if (document.hidden) {
        camera.position.copy(toPosition);
        yaw = toYaw;
        pitch = toPitch;
        applyRotation();
        tween = null;
        return;
      }
      tween = {
        fromPosition: camera.position.clone(),
        toPosition,
        fromYaw: yaw,
        toYaw,
        fromPitch: pitch,
        toPitch,
        start: performance.now(),
      };
    }

    /** Devuelve si había un acercamiento en marcha este fotograma. */
    function tickTween(now: number): boolean {
      if (!tween) return false;
      const t = Math.min((now - tween.start) / FOCUS_MS, 1);
      const eased = easeInOutCubic(t);
      camera.position.lerpVectors(tween.fromPosition, tween.toPosition, eased);
      yaw = lerpAngle(tween.fromYaw, tween.toYaw, eased);
      pitch = tween.fromPitch + (tween.toPitch - tween.fromPitch) * eased;
      applyRotation();
      if (t >= 1) tween = null;
      return true;
    }

    enterRoom.current = (target) => {
      tween = null;
      camera.position.copy(generalViewPosition(target));
      yaw = target.facing;
      pitch = 0;
      applyRotation();
    };

    // Planta la cámara en la sala inicial —la de `?serie=` si venía en la
    // URL, si no la primera—. Se resuelve aquí y no leyendo el estado de
    // React (`activeIndex` cambia solo al andar de una sala a otra, y este
    // efecto de montaje no debe reaccionar a eso).
    const startIndex = placements.findIndex((p) => p.room.slug === initialSlug);
    enterRoom.current(placements[startIndex >= 0 ? startIndex : 0] ?? placements[0]!);

    focusPainting.current = (hit) => {
      if (hit === null) {
        const here = roomAt(placements, camera.position.x, camera.position.z);
        const current = (here !== null ? placements[here] : null) ?? placements[0]!;
        startTween(generalViewPosition(current), current.facing, 0);
        return;
      }
      const room = placements[hit.placementIndex];
      const painting = room?.room.hung[hit.paintingIndex];
      if (!room || !painting) return;
      // Un poco de aire alrededor de la obra, y nunca tan cerca que se vea
      // el grano de la textura.
      const distance = Math.max(distanceFor(Math.max(painting.width, painting.height) * 1.9), 1.4);
      const sign = facingSign(room.facing);
      const wallZ = roomWallZ(room).art;
      const toPosition = new THREE.Vector3(room.center.x + painting.x, painting.y, wallZ + sign * distance);
      startTween(toPosition, room.facing, 0);
    };

    // ---- Caminar y mirar ---------------------------------------------------
    const keys = new Set<string>();
    const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
    function onKeyDown(event: KeyboardEvent) {
      if (!MOVE_KEYS.has(event.code)) return;
      // Solo al primer toque, no en cada repetición mientras se mantiene
      // pulsada: empezar a andar dice "ya no estoy mirando esa obra".
      if (!keys.has(event.code)) setFocused(null);
      keys.add(event.code);
      event.preventDefault();
    }
    function onKeyUp(event: KeyboardEvent) {
      keys.delete(event.code);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const move = new THREE.Vector3();

    function applyMovement(dt: number) {
      move.set(0, 0, 0);
      if (keys.has("KeyW")) move.add(forward);
      if (keys.has("KeyS")) move.sub(forward);
      if (keys.has("KeyD")) move.add(right);
      if (keys.has("KeyA")) move.sub(right);
      if (move.lengthSq() === 0) return;

      move.normalize().multiplyScalar(MOVE_SPEED * dt);
      const resolved = resolveCollision(
        segments,
        camera.position.x + move.x,
        camera.position.z + move.z,
        COLLISION_RADIUS,
      );
      camera.position.x = resolved.x;
      camera.position.z = resolved.z;
    }

    // ---- Interacción: arrastrar mira, clic corto enfoca una obra ---------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredMesh: THREE.Object3D | null = null;
    let pointerDownAt = { x: 0, y: 0 };
    let dragging = false;
    let lastPointer = { x: 0, y: 0 };

    function updatePointer(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pick(): THREE.Object3D | null {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...indexOfMesh.keys()], false);
      return hits[0]?.object ?? null;
    }

    function onPointerDown(event: PointerEvent) {
      pointerDownAt = { x: event.clientX, y: event.clientY };
      lastPointer = { x: event.clientX, y: event.clientY };
      dragging = true;
    }

    function onPointerMove(event: PointerEvent) {
      updatePointer(event);
      const hit = pick();
      if (hit !== hoveredMesh) {
        hoveredMesh = hit;
        renderer.domElement.style.cursor = hit ? "pointer" : "grab";
        setHovered(hit ? (indexOfMesh.get(hit) ?? null) : null);
      }

      if (!dragging) return;
      const dx = event.clientX - lastPointer.x;
      const dy = event.clientY - lastPointer.y;
      lastPointer = { x: event.clientX, y: event.clientY };
      yaw -= dx * LOOK_SENSITIVITY;
      pitch = THREE.MathUtils.clamp(pitch - dy * LOOK_SENSITIVITY, -MAX_PITCH, MAX_PITCH);
      applyRotation();
    }

    function onPointerUp(event: PointerEvent) {
      dragging = false;
      // Si venía de arrastrar para mirar, no cuenta como clic sobre la obra.
      const moved =
        Math.abs(event.clientX - pointerDownAt.x) > 4 ||
        Math.abs(event.clientY - pointerDownAt.y) > 4;
      if (moved) return;

      updatePointer(event);
      const hit = pick();
      const target = hit ? indexOfMesh.get(hit) : undefined;
      // Clic en una obra la enfoca —de la sala que sea, se ve a través de
      // una puerta abierta—; clic en la pared, vuelve a la vista general de
      // la sala en la que se esté. Ir a la ficha es explícito, desde el panel.
      setFocused(target ?? null);
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.style.cursor = "grab";

    // Un ResizeObserver, no el evento `resize` de window: al entrar o salir
    // de pantalla completa el tamaño del contenedor cambia por CSS, sin que
    // la ventana en sí cambie de tamaño.
    const resizeObserver = new ResizeObserver(() => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    resizeObserver.observe(mount);

    // Al volver a la pestaña, un fotograma para refrescar lo que se congeló.
    function onVisibility() {
      if (!document.hidden) renderer.render(scene, camera);
    }
    document.addEventListener("visibilitychange", onVisibility);

    let frame = 0;
    let lastFrameTime = performance.now();
    // Distinto de cualquier índice real: fuerza el primer chequeo de sala.
    let lastRoomIndex = -1;

    function animate() {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      // Tope de 100 ms: si la pestaña estuvo en segundo plano y el
      // navegador para requestAnimationFrame, al volver no hay que
      // atravesar media sala de un salto.
      const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;

      const wantsToMove = keys.size > 0;
      // Tocar una tecla de movimiento cancela el acercamiento en marcha: no
      // se le pelea al jugador su propio control.
      if (tween && wantsToMove) tween = null;

      if (tween) {
        tickTween(now);
      } else if (wantsToMove) {
        camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() > 0) forward.normalize();
        right.crossVectors(forward, up).normalize();
        applyMovement(dt);
      }

      const roomIndex = roomAt(placements, camera.position.x, camera.position.z);
      if (roomIndex !== null && roomIndex !== lastRoomIndex) {
        lastRoomIndex = roomIndex;
        setActiveIndex(roomIndex);
      }

      renderer.render(scene, camera);

      // Minimapa: posición y hacia dónde mira la cámara, en planta.
      const marker = cameraMarkerRef.current;
      if (marker) {
        camera.getWorldDirection(forward);
        const deg = (Math.atan2(forward.x, -forward.z) * 180) / Math.PI;
        marker.setAttribute("transform", `translate(${camera.position.x} ${camera.position.z}) rotate(${deg})`);
      }
    }
    animate();

    return () => {
      cancelAnimationFrame(frame);
      focusPainting.current = null;
      enterRoom.current = null;
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("theme-change", onThemeChange);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      for (const handle of paintingHandles) handle.dispose();
      for (const handle of labelHandles) handle.dispose();
      floorFlowers.dispose();
      floorFoliage.dispose();
      cornerTrees.dispose();
      floorPlan.dispose();
      path.dispose();
      envMap?.dispose();
      pmrem.dispose();
      for (const texture of materialDisposables) texture.dispose();
      materials.wall.dispose();
      materials.floor.dispose();
      materials.frame.dispose();
      materials.fixture.dispose();
      materials.path.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [placements, initialSlug]);

  // Cada cambio de obra enfocada mueve la cámara.
  useEffect(() => {
    focusPainting.current?.(focused);
  }, [focused]);

  // Flechas para pasar de obra, Escape para volver a la vista general. WASD
  // se gestiona aparte, dentro del efecto de montaje —es continuo (se
  // mantiene pulsado), no un salto discreto como esto.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "Escape") setFocused(null);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step]);

  const shown = focused ?? hovered;
  const painting = shown ? placements[shown.placementIndex]?.room.hung[shown.paintingIndex] : null;
  const activeHungLength = placement.room.hung.length;
  const focusedInActiveRoom = focused?.placementIndex === activeIndex ? focused.paintingIndex : null;

  const mapPadding = 1.5;
  const mapViewBox = `${bounds.minX - mapPadding} ${bounds.minZ - mapPadding} ${
    bounds.maxX - bounds.minX + mapPadding * 2
  } ${bounds.maxZ - bounds.minZ + mapPadding * 2}`;

  return (
    <div>
      {/* Una sala por serie; con una sola no hay nada que elegir. */}
      {placements.length > 1 ? (
        <nav aria-label="Salas" className="mb-4 flex flex-wrap items-center gap-2">
          {placements.map((p, index) => (
            <button
              key={p.room.id}
              type="button"
              onClick={() => selectRoom(index)}
              className={pastilla(index === activeIndex)}
            >
              {p.room.title}
            </button>
          ))}
        </nav>
      ) : null}

      {/* El panel se posiciona dentro de la sala, no sobre los controles. */}
      <div
        ref={stageRef}
        className={isFullscreen ? "relative h-dvh w-full bg-[color:var(--color-canvas)]" : "relative"}
      >
        <div
          ref={mountRef}
          className={isFullscreen ? "h-full w-full overflow-hidden" : "h-[70dvh] w-full overflow-hidden rounded"}
        />

        {/* Pantalla completa: la sala entera, sin cabecera ni pie. */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 rounded border border-[color:var(--color-canvas-dim)] bg-[color:var(--color-canvas)]/50 p-2"
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M21 16h-3a2 2 0 0 0-2 2v3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>

        {/* Indicador de carga: el museo entero tarda un poco en aparecer. */}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded bg-[color:var(--color-canvas)]/70">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--color-canvas-dim)] border-t-[color:var(--color-ink)]"
              role="status"
              aria-label="Cargando la sala"
            />
          </div>
        ) : null}

        {/* Minimapa: el plano del museo y hacia dónde mira la cámara. */}
        {placements.length > 1 ? (
          <svg
            viewBox={mapViewBox}
            className="pointer-events-none absolute bottom-4 right-4 h-28 w-36 rounded border border-[color:var(--color-canvas-dim)] bg-[color:var(--color-canvas)]/50"
            aria-hidden="true"
          >
            {placements.map((p, index) => {
              const wall = roomWallZ(p);
              return (
                <rect
                  key={p.room.id}
                  x={p.center.x - p.width / 2}
                  y={Math.min(wall.art, wall.entrance)}
                  width={p.width}
                  height={ROOM_DEPTH}
                  className={
                    index === activeIndex
                      ? "fill-[color:var(--color-oil)]/30 stroke-[color:var(--color-oil)]"
                      : "fill-[color:var(--color-canvas-dim)] stroke-[color:var(--color-ink-soft)]"
                  }
                  strokeWidth={0.15}
                />
              );
            })}
            <g ref={cameraMarkerRef}>
              <path d="M 0 -0.9 L 0.6 0.6 L -0.6 0.6 Z" className="fill-[color:var(--color-ink)]" />
            </g>
          </svg>
        ) : null}

        {/* Panel de la obra: la enfocada, o la que esté bajo el ratón. */}
        <div
          aria-live="polite"
          className={`pointer-events-none absolute bottom-4 left-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded bg-[color:var(--color-canvas)]/90 px-4 py-3 text-sm transition-opacity ${
            placements.length > 1 ? "right-40" : "right-4"
          }`}
          style={{ opacity: painting ? 1 : 0 }}
        >
          {painting ? (
            <>
              <strong className="display text-lg">{painting.title}</strong>
              <span className="tabular text-[color:var(--color-ink-soft)]">
                {painting.widthCm} × {painting.heightCm} cm ·{" "}
                {painting.priceLabel}
              </span>
              {focused ? (
                <Link
                  href={`/obra/${painting.slug}`}
                  className="pointer-events-auto ml-auto underline"
                >
                  Ver ficha
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {/* Recorrido por la sala. Hace lo mismo que las flechas del teclado. */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => step(-1)}
          className="rounded border border-[color:var(--color-canvas-dim)] px-3 py-1"
          aria-label="Obra anterior"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          className="rounded border border-[color:var(--color-canvas-dim)] px-3 py-1"
          aria-label="Obra siguiente"
        >
          ›
        </button>

        <span className="tabular text-[color:var(--color-ink-soft)]">
          {focusedInActiveRoom === null ? "Vista general" : `${focusedInActiveRoom + 1} / ${activeHungLength}`}
        </span>

        {focused ? (
          <button
            type="button"
            onClick={() => setFocused(null)}
            className="underline"
          >
            Ver la sala entera
          </button>
        ) : null}

        <span className="ml-auto text-[color:var(--color-ink-soft)]">
          WASD para moverte · arrastra para mirar · clic en un cuadro para
          acercarte · ← → para pasar de obra
        </span>
      </div>
    </div>
  );
}
