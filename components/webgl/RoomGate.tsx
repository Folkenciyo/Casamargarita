"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RoomPainting } from "./room-layout";
import { Room3D } from "./Room3D";

type Support = "checking" | "ok" | "small-screen" | "no-webgl" | "reduced-motion";

/**
 * La sala solo se monta si el equipo puede con ella. En móvil no se carga
 * three.js siquiera: la galería en 2D ya cuenta lo mismo y pesa cien veces
 * menos.
 */
export function RoomGate({ paintings }: { paintings: RoomPainting[] }) {
  const [support, setSupport] = useState<Support>("checking");

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

  if (support === "ok") return <Room3D paintings={paintings} />;
  if (support === "checking") {
    return <div className="h-[70dvh] w-full animate-pulse rounded bg-[color:var(--color-canvas-dim)]" />;
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
