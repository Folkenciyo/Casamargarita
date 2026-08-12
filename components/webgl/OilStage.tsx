"use client";

import { useEffect, useRef } from "react";
import { createOilRenderer, type OilRenderer } from "./oil-renderer";
import {
  COVER_MS,
  INTRO_MS,
  REVEAL_MS,
  getState,
  setPhase,
  subscribe,
  type StagePhase,
} from "./store";

const DURATION: Record<"intro" | "cover" | "reveal", number> = {
  intro: INTRO_MS,
  cover: COVER_MS,
  reveal: REVEAL_MS,
};

/** easeInOutCubic: la pincelada arranca y frena como un gesto, no lineal. */
function ease(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Capa fija sobre el DOM. El canvas y el contexto WebGL se crean una sola vez
 * y se reutilizan: crear y destruir contextos en cada navegación es caro y los
 * navegadores limitan cuántos admiten vivos.
 *
 * Nunca captura eventos ni aporta contenido: el HTML de debajo sigue siendo
 * navegable y accesible.
 */
export function OilStage({ onCoverComplete }: { onCoverComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OilRenderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const activePhase = useRef<StagePhase>("idle");
  const coverCallback = useRef(onCoverComplete);
  coverCallback.current = onCoverComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      rendererRef.current = createOilRenderer(canvas);
    } catch (error) {
      console.error("capa de óleo: no se pudo iniciar WebGL", error);
      rendererRef.current = null;
    }
    const renderer = rendererRef.current;
    if (!renderer) return;

    function tick() {
      const { phase, angle } = getState();

      if (phase === "idle") {
        frameRef.current = null;
        return;
      }

      // Pantalla cubierta esperando a que monte la ruta nueva: se mantiene el
      // último fotograma, sin animar.
      if (phase === "held") {
        activePhase.current = "held";
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (activePhase.current !== phase) {
        activePhase.current = phase;
        startedAt.current = performance.now();
      }

      const elapsed = performance.now() - (startedAt.current ?? 0);
      const progress = Math.min(elapsed / DURATION[phase], 1);

      renderer!.draw({
        progress: ease(progress),
        mode: phase === "intro" ? 0 : 1,
        angle,
        reveal: phase === "cover" ? 0 : 1,
      });

      if (progress >= 1) {
        startedAt.current = null;
        if (phase === "cover") {
          setPhase("held", angle);
          coverCallback.current();
        } else {
          activePhase.current = "idle";
          setPhase("idle", angle);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    /**
     * En una pestaña en segundo plano el navegador congela
     * requestAnimationFrame. Sin esto, quien hace clic y cambia de pestaña
     * vuelve y se encuentra la pantalla tapada de pintura para siempre.
     * El guardián termina la fase por tiempo aunque no haya fotogramas.
     */
    function armWatchdog(phase: StagePhase) {
      if (watchdogRef.current !== null) clearTimeout(watchdogRef.current);
      if (phase === "idle" || phase === "held") return;

      watchdogRef.current = window.setTimeout(() => {
        const { phase: current, angle } = getState();
        if (current !== phase) return;
        if (current === "cover") {
          setPhase("held", angle);
          coverCallback.current();
        } else {
          activePhase.current = "idle";
          setPhase("idle", angle);
        }
      }, DURATION[phase] + 400);
    }

    // El bucle solo existe mientras haya animación: en reposo no consume nada.
    function sync() {
      const { phase } = getState();
      const visible = phase !== "idle";
      canvas!.style.opacity = visible ? "1" : "0";
      canvas!.dataset.oilStage = phase;
      armWatchdog(phase);
      if (visible && frameRef.current === null) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    const unsubscribe = subscribe(sync);
    sync();

    const onResize = () => renderer.resize();
    window.addEventListener("resize", onResize);

    return () => {
      unsubscribe();
      window.removeEventListener("resize", onResize);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (watchdogRef.current !== null) clearTimeout(watchdogRef.current);
      frameRef.current = null;
      watchdogRef.current = null;
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-oil-stage="idle"
      className="pointer-events-none fixed inset-0 z-50 h-dvh w-screen"
      style={{ opacity: 0 }}
    />
  );
}
