"use client";

import { useEffect, useRef } from "react";
import { createOilRenderer, type OilRenderer } from "./oil-renderer";
import {
  COVER_MS,
  INTRO_MS,
  NAVIGATE_AT,
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

/** easeInOutCubic: la mano arranca y frena. Para manchar y para la intro. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * easeOutCubic, solo para retirar.
 *
 * Con el mismo easing que al manchar, la pintura se quedaba quieta un cuarto
 * de segundo antes de empezar a irse: el gesto se apelotonaba en el centro del
 * tiempo. Al levantar la pintura interesa lo contrario —se va enseguida y el
 * último velo se disipa despacio—, que además destapa antes lo que hay debajo.
 */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Capa fija sobre el DOM. El canvas y el contexto WebGL se crean una sola vez
 * y se reutilizan: crear y destruir contextos en cada navegación es caro y los
 * navegadores limitan cuántos admiten vivos.
 *
 * Nunca captura eventos ni aporta contenido: el HTML de debajo sigue siendo
 * navegable y accesible.
 */
export function OilStage({
  onCoverEnough,
  onCoverComplete,
}: {
  /** El trazo ya tapa lo suficiente: momento de pedir la vista nueva. */
  onCoverEnough: () => void;
  onCoverComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OilRenderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const activePhase = useRef<StagePhase>("idle");
  const navegado = useRef(false);
  const coverCallback = useRef(onCoverComplete);
  coverCallback.current = onCoverComplete;
  const enoughCallback = useRef(onCoverEnough);
  enoughCallback.current = onCoverEnough;

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

      // Pantalla manchada esperando a que monte la vista nueva. Se sigue
      // dibujando —con el trazo al final de su recorrido— en vez de congelar
      // el último fotograma: así la veta del óleo se mueve y la espera parece
      // pintura fresca y no una captura pegada encima.
      if (phase === "held") {
        activePhase.current = "held";
        renderer!.draw({
          progress: 1,
          mode: 1,
          angle,
          reveal: 0,
          time: performance.now() / 1000,
        });
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (activePhase.current !== phase) {
        activePhase.current = phase;
        startedAt.current = performance.now();
        if (phase === "cover") navegado.current = false;
      }

      const elapsed = performance.now() - (startedAt.current ?? 0);
      const progress = Math.min(elapsed / DURATION[phase], 1);

      const suave = phase === "cover" || phase === "intro" ? easeInOut : easeOut;

      renderer!.draw({
        progress: suave(progress),
        mode: phase === "intro" ? 0 : 1,
        angle,
        reveal: phase === "cover" ? 0 : 1,
        time: performance.now() / 1000,
      });

      // A media pincelada la mancha ya tapa: se pide la vista nueva ahora para
      // que cargue debajo, en vez de regalar lo que queda de animación.
      if (phase === "cover" && !navegado.current && progress >= NAVIGATE_AT) {
        navegado.current = true;
        enoughCallback.current();
      }

      if (progress >= 1) {
        startedAt.current = null;
        if (phase === "cover") {
          if (!navegado.current) {
            navegado.current = true;
            enoughCallback.current();
          }
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
      if (phase === "idle") return;

      // Cubierto y esperando: si la vista nueva no llega —red caída, error del
      // servidor—, más vale destapar y que se vea la página de antes que dejar
      // a alguien delante de una pantalla marrón.
      if (phase === "held") {
        watchdogRef.current = window.setTimeout(() => {
          if (getState().phase !== "held") return;
          setPhase("reveal", getState().angle);
        }, 8000);
        return;
      }

      watchdogRef.current = window.setTimeout(() => {
        const { phase: current, angle } = getState();
        if (current !== phase) return;
        if (current === "cover") {
          if (!navegado.current) {
            navegado.current = true;
            enoughCallback.current();
          }
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
