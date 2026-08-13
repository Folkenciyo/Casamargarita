"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/obras", label: "Obras" },
  { href: "/admin/series", label: "Series" },
  { href: "/admin/diario", label: "Diario" },
  { href: "/admin/artista", label: "Ficha de artista" },
  { href: "/admin/trayectoria", label: "Trayectoria" },
  { href: "/admin/consultas", label: "Consultas" },
  { href: "/admin/encargos", label: "Encargos" },
] as const;

/**
 * `/admin` solo se marca en coincidencia exacta: si no, el resumen quedaría
 * activo en todas las vistas del panel, que cuelgan de él.
 */
function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNav({ unread }: { unread: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-6">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex items-center gap-2 border-b-2 border-[color:var(--color-oil)] pb-1 font-semibold"
                : "flex items-center gap-2 border-b-2 border-transparent pb-1 text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-ink)]"
            }
          >
            {link.label}
            {link.href === "/admin/consultas" && unread > 0 ? (
              <span
                aria-label={`${unread} consultas sin leer`}
                className="tabular rounded-full bg-[color:var(--color-oil)] px-2 py-0.5 text-xs text-[color:var(--color-canvas)]"
              >
                {unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
