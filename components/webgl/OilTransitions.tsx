"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
  HOLD_MIN_MS,
  INTRO_SEEN_KEY,
  getState,
  prefersReducedMotion,
  randomAngle,
  setPhase,
} from "./store";

import { OilStage } from "./OilStage";

function supportsWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Intercepta la navegación interna para meter un brochazo entre vistas y
 * reproduce la intro de óleo la primera vez de cada sesión.
 *
 * Si el navegador no tiene WebGL o el sistema pide movimiento reducido, no se
 * monta nada: los enlaces se comportan como enlaces normales.
 */
export function OilTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const pendingHref = useRef<string | null>(null);
  const enabled = useRef(false);
  /** Cuándo quedó la pantalla cubierta del todo, para no descubrirla al vuelo. */
  const heldSince = useRef<number | null>(null);
  const revealTimer = useRef<number | null>(null);
  /** Hay una navegación en marcha cuyo cambio de ruta todavía no ha llegado. */
  const esperandoRuta = useRef(false);
  const rutaLista = useRef(false);

  useEffect(() => {
    enabled.current = !prefersReducedMotion() && supportsWebgl();
    if (!enabled.current) return;

    if (window.sessionStorage.getItem(INTRO_SEEN_KEY)) return;

    function startIntro() {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      setPhase("intro", randomAngle());
    }

    // En una pestaña en segundo plano el navegador congela
    // requestAnimationFrame: la intro no se vería y solo dejaría la pantalla
    // cubierta de pintura. Se espera a que la pestaña esté a la vista.
    if (!document.hidden) {
      startIntro();
      return;
    }

    function onVisible() {
      if (document.hidden) return;
      document.removeEventListener("visibilitychange", onVisible);
      startIntro();
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  /**
   * Retira el brochazo, pero nunca antes de que la pantalla haya estado
   * cubierta del todo un instante. Hacen falta las dos condiciones —trazo
   * terminado y vista montada— y cada una puede llegar antes que la otra, así
   * que la última en cumplirse es la que dispara.
   */
  const destaparSiTodoListo = useCallback(() => {
    if (!rutaLista.current || heldSince.current === null) return;
    if (revealTimer.current !== null) return;

    const espera = Math.max(
      0,
      HOLD_MIN_MS - (performance.now() - heldSince.current),
    );

    const destapar = () => {
      revealTimer.current = null;
      heldSince.current = null;
      rutaLista.current = false;
      setPhase("reveal", getState().angle);
    };

    if (espera === 0) destapar();
    else revealTimer.current = window.setTimeout(destapar, espera);
  }, []);

  // La vista nueva ya está montada. Puede ocurrir a media pincelada.
  useEffect(() => {
    if (!esperandoRuta.current) return;
    esperandoRuta.current = false;
    rutaLista.current = true;
    destaparSiTodoListo();
  }, [pathname, destaparSiTodoListo]);

  /** El trazo ya tapa: se pide la vista nueva y carga bajo la pintura. */
  const handleCoverEnough = useCallback(() => {
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) router.push(href);
  }, [router]);

  const handleCoverComplete = useCallback(() => {
    heldSince.current = performance.now();
    destaparSiTodoListo();
  }, [destaparSiTodoListo]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!enabled.current) return;
      // Respetar clic con modificadores, botón central y target="_blank".
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download"))
        return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      // El panel de administración no lleva animaciones.
      if (url.pathname.startsWith("/admin")) return;

      // stopPropagation además de preventDefault: si el clic llegara al
      // handler de <Link>, Next navegaría al instante y no habría brochazo.
      event.preventDefault();
      event.stopPropagation();
      pendingHref.current = url.pathname + url.search;
      esperandoRuta.current = true;
      rutaLista.current = false;
      heldSince.current = null;
      setPhase("cover", randomAngle());
    }

    // Fase de captura: hay que adelantarse al handler de <Link>.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <OilStage
      onCoverEnough={handleCoverEnough}
      onCoverComplete={handleCoverComplete}
    />
  );
}
