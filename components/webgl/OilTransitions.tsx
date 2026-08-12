"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
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

  // Al confirmarse la ruta nueva, el brochazo se retira.
  useEffect(() => {
    if (pendingHref.current === null) return;
    pendingHref.current = null;
    setPhase("reveal", getState().angle);
  }, [pathname]);

  const handleCoverComplete = useCallback(() => {
    const href = pendingHref.current;
    if (href) router.push(href);
    else setPhase("idle");
  }, [router]);

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
      setPhase("cover", randomAngle());
    }

    // Fase de captura: hay que adelantarse al handler de <Link>.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return <OilStage onCoverComplete={handleCoverComplete} />;
}
