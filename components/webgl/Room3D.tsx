"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import {
  EYE_LEVEL,
  WALL_HEIGHT,
  hangPaintings,
  type RoomPainting,
} from "./room-layout";

const FRAME_DEPTH = 0.06;
const FRAME_BORDER = 0.05;
/** Ancho de pared que se ve al entrar, antes de fijarse en ninguna obra. */
const FRAMED_WIDTH = 6;
const FLIGHT_MS = 900;

/**
 * Texturas PBR (color + normal + rugosidad) de pared, suelo y marco.
 * Los `.webp` los genera `scripts/build-room-textures.ts` a partir de los
 * originales CC0 en las mismas carpetas — no se suben a mano.
 */
const WALL_TEXTURE = "/Sala/pared";
const FLOOR_TEXTURE = "/Sala/suelo";
const FRAME_TEXTURE = "/Sala/madera";
const ROOM_HDRI = "/Sala/church-museum-1k.exr";

/** Cada cuántos metros se repite la textura, para que no salga estirada. */
const WALL_TILE_METERS = 2.2;
const FLOOR_TILE_METERS = 1.4;

/**
 * Sala virtual con three.js directo, sin react-three-fiber: la escena es
 * estática salvo la cámara, así que el reconciliador de React no aporta nada
 * y sí bastante peso.
 *
 * La cámara se planta delante de la obra que elijas —con el ratón, con las
 * flechas o con los botones— en lugar de dejarte orbitar a ciegas.
 */
export function Room3D({ paintings }: { paintings: RoomPainting[] }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { hung, wallWidth } = useMemo(
    () => hangPaintings(paintings),
    [paintings],
  );

  const [focused, setFocused] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  // Puente entre la UI de React y la escena de three.
  const flyTo = useRef<((index: number | null) => void) | null>(null);

  const step = useCallback(
    (delta: number) => {
      setFocused((current) => {
        if (hung.length === 0) return null;
        if (current === null) return delta > 0 ? 0 : hung.length - 1;
        return (current + delta + hung.length) % hung.length;
      });
    },
    [hung.length],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e7e0d3");

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    );

    /** Distancia a la que un ancho dado llena el encuadre. */
    function distanceFor(width: number) {
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const forWidth = width / 2 / Math.tan(hFov / 2);
      const forHeight = (WALL_HEIGHT * 0.9) / 2 / Math.tan(vFov / 2);
      return Math.max(forWidth, forHeight) * 1.05;
    }

    const startDistance = distanceFor(Math.min(wallWidth, FRAMED_WIDTH));
    camera.position.set(0, EYE_LEVEL, startDistance);

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
    renderer.toneMappingExposure = 0.85;
    mount.appendChild(renderer.domElement);

    // Texturas y su limpieza al desmontar: nada se libera solo.
    const textureLoader = new THREE.TextureLoader();
    const disposables: Array<{ dispose: () => void }> = [];

    /** Un mapa PBR, repetido para que no salga estirado sobre la superficie. */
    function loadMap(
      base: string,
      kind: "color" | "normal" | "roughness",
      repeatX: number,
      repeatY: number,
    ): THREE.Texture {
      const texture = textureLoader.load(`${base}/${kind}.webp`, () =>
        renderer.render(scene, camera),
      );
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      // Solo el color es una foto; normal y rugosidad son datos, no color,
      // y marcarlos sRGB desvirtúa lo que cuentan.
      if (kind === "color") texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      disposables.push(texture);
      return texture;
    }

    // Luz de entorno: un HDRI real de interior de museo, convertido a mapa de
    // reflejo/irradiancia. En cuanto llega, todo material PBR de la escena
    // —pared, suelo, marcos, hasta el lienzo de cada obra— la recibe solo con
    // poner `scene.environment`, sin tocarlos uno a uno.
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new EXRLoader().load(ROOM_HDRI, (hdri) => {
      const envMap = pmrem.fromEquirectangular(hdri).texture;
      scene.environment = envMap;
      disposables.push(envMap);
      hdri.dispose();
      pmrem.dispose();
      renderer.render(scene, camera);
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, EYE_LEVEL, 0);
    controls.enableDamping = true;
    // Se puede recorrer la pared en horizontal, pero no salirse de la sala.
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.minDistance = 1.2;
    controls.maxDistance = distanceFor(wallWidth) * 1.1;
    // Sin poder mirar por debajo del suelo ni rodear la pared por detrás.
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 1.9;
    controls.minAzimuthAngle = -Math.PI / 3;
    controls.maxAzimuthAngle = Math.PI / 3;

    // Sala: pared del fondo, suelo y dos laterales insinuados. Geometría más
    // ancha que el encuadre para que no asome el fondo por las esquinas. El
    // reparto de repeticiones sale de esa misma geometría, no del ancho
    // visible, para que la densidad de la pared no cambie entre el trozo que
    // se ve de frente y el que se insinúa en los bordes.
    const wallW = wallWidth + 30;
    const wallH = WALL_HEIGHT + 8;
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: loadMap(WALL_TEXTURE, "color", wallW / WALL_TILE_METERS, wallH / WALL_TILE_METERS),
      normalMap: loadMap(WALL_TEXTURE, "normal", wallW / WALL_TILE_METERS, wallH / WALL_TILE_METERS),
      roughnessMap: loadMap(WALL_TEXTURE, "roughness", wallW / WALL_TILE_METERS, wallH / WALL_TILE_METERS),
    });
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(wallW, wallH),
      wallMaterial,
    );
    backWall.position.set(0, WALL_HEIGHT / 2, 0);
    scene.add(backWall);

    const floorW = wallWidth + 30;
    const floorD = 40;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({
        map: loadMap(FLOOR_TEXTURE, "color", floorW / FLOOR_TILE_METERS, floorD / FLOOR_TILE_METERS),
        normalMap: loadMap(FLOOR_TEXTURE, "normal", floorW / FLOOR_TILE_METERS, floorD / FLOOR_TILE_METERS),
        roughnessMap: loadMap(FLOOR_TEXTURE, "roughness", floorW / FLOOR_TILE_METERS, floorD / FLOOR_TILE_METERS),
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 7;
    scene.add(floor);

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(14, WALL_HEIGHT),
        wallMaterial,
      );
      wall.rotation.y = (-side * Math.PI) / 2;
      wall.position.set((side * wallWidth) / 2, WALL_HEIGHT / 2, 7);
      scene.add(wall);
    }

    // Antes de que hubiera un HDRI de entorno, esta luz tenía que hacerlo
    // todo ella sola: con `scene.environment` puesto, la misma intensidad
    // quemaba de blanco la pared clara. Se baja a lo que hace falta para que
    // la textura de la pared se siga viendo, no solo el brillo.
    scene.add(new THREE.AmbientLight("#ffffff", 0.5));
    const fill = new THREE.DirectionalLight("#fff6e8", 0.6);
    fill.position.set(0, 6, 8);
    scene.add(fill);

    // Un foco por obra, como en una sala de exposición. Un solo material de
    // madera para todos los marcos: cambia el tamaño de la caja, no el
    // material, así que no hace falta cargar la textura una vez por obra.
    const frameMaterial = new THREE.MeshStandardMaterial({
      map: loadMap(FRAME_TEXTURE, "color", 1, 1),
      normalMap: loadMap(FRAME_TEXTURE, "normal", 1, 1),
      roughnessMap: loadMap(FRAME_TEXTURE, "roughness", 1, 1),
    });
    const indexOfMesh = new Map<THREE.Object3D, number>();

    hung.forEach((painting, index) => {
      const texture = textureLoader.load(painting.textureUrl, () => {
        renderer.render(scene, camera);
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      disposables.push(texture);

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(
          painting.width + FRAME_BORDER * 2,
          painting.height + FRAME_BORDER * 2,
          FRAME_DEPTH,
        ),
        frameMaterial,
      );
      frame.position.set(painting.x, painting.y, FRAME_DEPTH / 2);
      scene.add(frame);

      const canvasMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(painting.width, painting.height),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }),
      );
      canvasMesh.position.set(painting.x, painting.y, FRAME_DEPTH + 0.001);
      scene.add(canvasMesh);
      indexOfMesh.set(canvasMesh, index);

      const spot = new THREE.SpotLight("#fff4e2", 14, 9, Math.PI / 7, 0.6, 1.4);
      spot.position.set(painting.x, WALL_HEIGHT - 0.3, 2.2);
      spot.target = canvasMesh;
      scene.add(spot);
      scene.add(spot.target);
    });

    // ---- Vuelo de cámara -------------------------------------------------
    const desiredTarget = new THREE.Vector3(0, EYE_LEVEL, 0);
    const desiredPosition = new THREE.Vector3(0, EYE_LEVEL, startDistance);
    let flyingUntil = 0;

    flyTo.current = (index) => {
      if (index === null) {
        desiredTarget.set(0, EYE_LEVEL, 0);
        desiredPosition.set(0, EYE_LEVEL, startDistance);
      } else {
        const painting = hung[index];
        if (!painting) return;
        // Un poco de aire alrededor de la obra, y nunca tan cerca que se vea
        // el grano de la textura.
        const distance = Math.max(
          distanceFor(Math.max(painting.width, painting.height) * 1.9),
          1.4,
        );
        desiredTarget.set(painting.x, painting.y, 0);
        desiredPosition.set(painting.x, painting.y, distance);
      }
      // Con la pestaña en segundo plano el navegador congela
      // requestAnimationFrame: no habría vuelo, solo un salto al volver. Se
      // coloca la cámara ya, y al volver la vista está donde toca.
      if (document.hidden) {
        camera.position.copy(desiredPosition);
        controls.target.copy(desiredTarget);
        controls.update();
        flyingUntil = 0;
        return;
      }

      flyingUntil = performance.now() + FLIGHT_MS;
    };

    // ---- Interacción -----------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredMesh: THREE.Object3D | null = null;
    let pointerDownAt = { x: 0, y: 0 };

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

    function onPointerMove(event: PointerEvent) {
      updatePointer(event);
      const hit = pick();
      if (hit === hoveredMesh) return;
      hoveredMesh = hit;
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      setHovered(hit ? (indexOfMesh.get(hit) ?? null) : null);
    }

    function onPointerDown(event: PointerEvent) {
      pointerDownAt = { x: event.clientX, y: event.clientY };
    }

    function onPointerUp(event: PointerEvent) {
      // Si venía de arrastrar para mirar, no cuenta como clic sobre la obra.
      const moved =
        Math.abs(event.clientX - pointerDownAt.x) > 4 ||
        Math.abs(event.clientY - pointerDownAt.y) > 4;
      if (moved) return;

      updatePointer(event);
      const hit = pick();
      const index = hit ? indexOfMesh.get(hit) : undefined;
      // Clic en una obra la enfoca; clic en la pared, vuelve a la vista
      // general. Ir a la ficha es explícito, desde el panel.
      setFocused(index ?? null);
    }

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.style.cursor = "grab";

    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      controls.maxDistance = distanceFor(wallWidth) * 1.1;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", onResize);

    // Al volver a la pestaña, un fotograma para refrescar lo que se congeló.
    function onVisibility() {
      if (!document.hidden) renderer.render(scene, camera);
    }
    document.addEventListener("visibilitychange", onVisibility);

    const panLimit = Math.max(wallWidth / 2 - 1, 0);
    let frame = 0;
    function animate() {
      frame = requestAnimationFrame(animate);

      const flying = performance.now() < flyingUntil;
      if (flying) {
        // Durante el vuelo manda la cámara, no el ratón.
        controls.enabled = false;
        camera.position.lerp(desiredPosition, 0.09);
        controls.target.lerp(desiredTarget, 0.09);
      } else {
        controls.enabled = true;
      }

      // El objetivo se mueve solo a lo largo de la pared: ni se sube al techo
      // ni se sale por los lados.
      controls.target.x = THREE.MathUtils.clamp(
        controls.target.x,
        -panLimit,
        panLimit,
      );
      controls.target.y = EYE_LEVEL;
      controls.target.z = 0;
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frame);
      flyTo.current = null;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      // Liberar GPU: texturas y geometrías no se recogen solas.
      for (const item of disposables) item.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [hung, wallWidth]);

  // Cada cambio de obra enfocada mueve la cámara.
  useEffect(() => {
    flyTo.current?.(focused);
  }, [focused]);

  // Flechas para pasar de obra, Escape para volver a la vista general.
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
  const painting = shown === null ? null : hung[shown];

  return (
    <div>
      {/* El panel se posiciona dentro de la sala, no sobre los controles. */}
      <div className="relative">
        <div
          ref={mountRef}
          className="h-[70dvh] w-full overflow-hidden rounded"
        />

        {/* Panel de la obra: la enfocada, o la que esté bajo el ratón. */}
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded bg-[color:var(--color-canvas)]/90 px-4 py-3 text-sm transition-opacity"
          style={{ opacity: painting ? 1 : 0 }}
        >
          {painting ? (
            <>
              <strong className="display text-lg">{painting.title}</strong>
              <span className="tabular text-[color:var(--color-ink-soft)]">
                {painting.widthCm} × {painting.heightCm} cm ·{" "}
                {painting.priceLabel}
              </span>
              {focused !== null ? (
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
          {focused === null
            ? "Vista general"
            : `${focused + 1} / ${hung.length}`}
        </span>

        {focused !== null ? (
          <button
            type="button"
            onClick={() => setFocused(null)}
            className="underline"
          >
            Ver la sala entera
          </button>
        ) : null}

        <span className="ml-auto text-[color:var(--color-ink-soft)]">
          Clic en un cuadro para acercarte · arrastra para mirar · ← → para
          pasar de obra
        </span>
      </div>
    </div>
  );
}
