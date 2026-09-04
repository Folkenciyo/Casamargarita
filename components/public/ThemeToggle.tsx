"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function applyTheme(theme: Theme): void {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new CustomEvent<Theme>("theme-change", { detail: theme }));
}

/**
 * Claro/oscuro para todo el sitio público —no solo esta página—, y de
 * paso para la sala 3D: `Room3D` escucha el mismo aviso (`theme-change`) y
 * cambia el HDRI de día por el de noche. No se anuncia esa parte en ningún
 * sitio a propósito: quien lo descubre paseando por la sala, lo descubre
 * solo.
 *
 * El icono arranca en "claro" y se corrige en un efecto tras montar —igual
 * que ya deja el tema puesto el script de `app/layout.tsx` antes de
 * hidratar—, para que el primer render en el cliente coincida con el del
 * servidor y no haya aviso de hidratación.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        </svg>
      )}
    </button>
  );
}
