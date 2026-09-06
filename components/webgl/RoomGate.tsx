"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { RoomSection } from "./room-layout";
import { RoomLoader } from "./RoomLoader";
import { roomLoadLabel, roomLoadProgress, type RoomLoadPhaseId } from "./room-loading";

type Support = "checking" | "ok" | "small-screen" | "no-webgl" | "reduced-motion";

/**
 * La sala no entra en el paquete de la página: se pide su módulo —y con él
 * three.js entero, los cargadores de EXR y FBX— la primera vez que se
 * renderiza este componente, que es al pulsar «Entrar en la sala». Hasta
 * entonces la página de la sala pesa lo que cualquier otra del sitio.
 */
const Room3D = dynamic(() => import("./Room3D").then((m) => m.Room3D), {
  ssr: false,
});

/** El módulo tarda en llegar tanto como cualquier descarga. Pedirlo al pasar
 * el ratón por el botón suele bastar para que al pulsar ya esté. */
function preloadRoom() {
  void import("./Room3D");
}

/** Lo que se lee mientras baja el módulo de la sala, antes de que haya nada
 * que medir: es trabajo real, pero de progreso desconocido, así que la barra
 * espera en cero en vez de inventarse un avance. */
const OPENING_LABEL = "Abriendo la sala";
/** Lo que dura el fundido de la pantalla de carga al destaparse la sala. */
const FADE_MS = 500;

/**
 * La sala solo se monta si el equipo puede con ella. En móvil no se carga
 * three.js siquiera: la galería en 2D ya cuenta lo mismo y pesa cien veces
 * menos.
 *
 * Cuando sí puede, tampoco se monta sola: primero se ofrece, y solo al
 * aceptar empieza a descargarse y a construirse el museo, con la espera
 * contada por `RoomLoader`. Antes se montaba al abrir la página, y entre el
 * módulo, el cielo HDRI, las texturas y levantar el edificio entero la
 * pestaña se quedaba en blanco varios segundos sin explicar por qué.
 */
export function RoomGate({
  sections,
  initialSlug,
}: {
  sections: RoomSection[];
  initialSlug?: string;
}) {
  const [support, setSupport] = useState<Support>("checking");
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [load, setLoad] = useState({ value: 0, label: OPENING_LABEL });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSupport("reduced-motion");
      return;
    }
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setSupport("small-screen");
      return;
    }
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    setSupport(gl ? "ok" : "no-webgl");
  }, []);

  // La barra nunca retrocede: el total de descargas del gestor de three crece
  // según se le van pidiendo ficheros, así que su fracción sí puede bajar.
  const onPhase = useCallback((id: RoomLoadPhaseId, within: number) => {
    setLoad((prev) => ({
      value: Math.max(prev.value, roomLoadProgress(id, within)),
      label: roomLoadLabel(id),
    }));
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setShowLoader(false), FADE_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  if (support === "checking") {
    return <div className="h-[70dvh] w-full animate-pulse rounded bg-[color:var(--color-canvas-dim)]" />;
  }

  if (support === "ok") {
    if (!entered) {
      return (
        <div className="flex h-[70dvh] w-full flex-col items-center justify-center gap-6 rounded border border-[color:var(--color-canvas-dim)] px-6 text-center">
          <p className="lead max-w-prose">
            Un museo que se recorre andando, con la obra colgada a tamaño real.
          </p>
          <button
            type="button"
            onClick={() => setEntered(true)}
            onMouseEnter={preloadRoom}
            onFocus={preloadRoom}
            className="rounded-full bg-[color:var(--color-ink)] px-6 py-3 text-[color:var(--color-canvas)] transition-opacity hover:opacity-90"
          >
            Entrar en la sala
          </button>
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            WASD para andar · arrastra para mirar alrededor · clic en un cuadro para
            acercarte
          </p>
        </div>
      );
    }

    // El `min-h` no es decorativo: hasta que llega el módulo de la sala aquí
    // dentro no hay nada que ocupe sitio, y la pantalla de carga —colocada
    // sobre este hueco— se quedaría en un rectángulo de cero píxeles justo
    // durante la primera espera. Es la altura que luego pide el lienzo.
    return (
      <div className="relative min-h-[70dvh]">
        <Room3D sections={sections} initialSlug={initialSlug} onPhase={onPhase} onReady={onReady} />
        {showLoader ? (
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: ready ? 0 : 1, pointerEvents: ready ? "none" : undefined }}
          >
            <RoomLoader progress={load.value} label={load.label} />
          </div>
        ) : null}
      </div>
    );
  }

  const reason = {
    "small-screen": "La sala necesita una pantalla de al menos 1024 px de ancho.",
    "no-webgl": "Este navegador no tiene WebGL disponible.",
    "reduced-motion":
      "Tienes activado el movimiento reducido del sistema, así que no se carga la sala.",
  }[support];

  return (
    <div className="rounded border border-[color:var(--color-canvas-dim)] p-6">
      <p>{reason}</p>
      <Link href="/galeria" className="mt-3 inline-block underline">
        Ver la galería en 2D
      </Link>
    </div>
  );
}
