"use client";

import { useEffect, useRef, useState } from "react";
import { fieldAt } from "./daisy-field";
import { createDaisyRenderer, type DaisyRenderer } from "./daisy-renderer";
import { prefersReducedMotion } from "./store";

/** Fotogramas por segundo del fondo. */
const FPS = 30;

function supportsWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Capa de fondo con las margaritas de la casa mecidas por el viento.
 *
 * Va detrás de todo (`-z-10`), no captura eventos y es `aria-hidden`: es
 * atmósfera, no contenido. Si no hay WebGL o el sistema pide movimiento
 * reducido no se monta el canvas y la página queda tal cual, con su fondo de
 * lienzo de siempre.
 */
export function DaisyField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);

  // El estado se decide en el cliente —hace falta `matchMedia` y un contexto
  // WebGL— y el efecto de abajo no puede correr hasta que exista el canvas.
  useEffect(() => {
    setEnabled(!prefersReducedMotion() && supportsWebgl());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: DaisyRenderer | null = null;
    try {
      renderer = createDaisyRenderer(canvas);
    } catch (error) {
      console.error("campo de margaritas: no se pudo iniciar WebGL", error);
      return;
    }
    if (!renderer) return;

    let frame: number | null = null;
    let lastDraw = 0;
    const startedAt = performance.now();

    function tick(now: number) {
      frame = requestAnimationFrame(tick);

      // A 30 fps: el meneo es lento y a 120 Hz se estarían sombreando cuatro
      // veces los mismos píxeles para nada. La batería lo agradece.
      if (now - lastDraw < 1000 / FPS) return;
      lastDraw = now;

      const seconds = (now - startedAt) / 1000;
      renderer!.draw(fieldAt(seconds), seconds, window.scrollY);
    }

    // En segundo plano el navegador ya congela requestAnimationFrame, pero
    // además se suelta el bucle: una pestaña oculta no debe tener nada vivo.
    function onVisibility() {
      if (document.hidden) {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        return;
      }
      if (frame === null) frame = requestAnimationFrame(tick);
    }

    const onResize = () => renderer.resize();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (frame !== null) cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-dvh w-screen"
    />
  );
}
