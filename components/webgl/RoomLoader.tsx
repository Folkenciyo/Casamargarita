"use client";

import { useEffect, useRef } from "react";
import { createOilRenderer } from "./oil-renderer";

/** Cuánto tarda la brocha en alcanzar al progreso real, más o menos. A 6 por
 * segundo el trazo se lee como un gesto continuo aunque el progreso llegue a
 * saltos de fase en fase. */
const CHASE_PER_SECOND = 6;

/**
 * La espera mientras se monta la sala, contada con el mismo óleo que las
 * transiciones del sitio: `createOilRenderer` en modo brochazo sobre un
 * lienzo apaisado, con el progreso real de la carga en vez del tiempo.
 *
 * El trazo persigue al progreso en lugar de saltar a él, para que se lea como
 * un gesto continuo aunque el progreso llegue a saltos de fase en fase. El
 * número y `aria-valuenow`, en cambio, son el progreso de verdad y los pinta
 * React: si dependieran del fotograma, con la pestaña en segundo plano —donde
 * el navegador no llama a `requestAnimationFrame`— se quedarían clavados en
 * cero mientras la sala se monta de todas formas.
 */
export function RoomLoader({ progress, label }: { progress: number; label: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const percent = Math.round(progress * 100);
  // El bucle de dibujo se monta una sola vez y lee el progreso de aquí: si
  // dependiera de la prop, cada avance recrearía el contexto WebGL.
  const targetRef = useRef(progress);
  targetRef.current = progress;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // El lienzo se crea aquí y no en el JSX, igual que hace la sala con el
    // suyo. `dispose` pierde el contexto a propósito, y a un canvas con el
    // contexto perdido `getContext` le devuelve ese mismo contexto muerto:
    // reutilizando el del JSX, el segundo montaje —React repite los efectos en
    // desarrollo— se encontraba un contexto inservible y el shader no
    // compilaba, con la página entera cayéndose al error boundary.
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    mount.appendChild(canvas);

    const oil = createOilRenderer(canvas);
    // Sin WebGL no hay brocha, pero el texto y el porcentaje siguen contando
    // la espera. La sala tampoco se habría llegado a montar.
    if (!oil) {
      canvas.remove();
      return;
    }

    const start = performance.now();
    let last = start;
    let shown = 0;
    let frame = requestAnimationFrame(function draw(now) {
      frame = requestAnimationFrame(draw);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // Persecución exponencial: independiente de los fotogramas por segundo
      // —en una pantalla de 120 Hz la barra no corre el doble—.
      shown += (targetRef.current - shown) * (1 - Math.exp(-dt * CHASE_PER_SECOND));
      oil.draw({
        progress: shown,
        mode: 1,
        angle: 0,
        reveal: 0,
        time: (now - start) / 1000,
        aspect: 2,
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      oil.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded bg-[color:var(--color-canvas)] px-6">
      <div
        role="progressbar"
        aria-label="Cargando la sala"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="w-full max-w-md overflow-hidden rounded-sm border border-[color:var(--color-canvas-dim)]"
      >
        <div ref={mountRef} className="h-11 w-full" />
      </div>

      <p className="flex w-full max-w-md items-baseline justify-between gap-4 text-sm text-[color:var(--color-ink-soft)]">
        <span aria-live="polite">{label}</span>
        <span className="tabular">{percent} %</span>
      </p>
    </div>
  );
}
