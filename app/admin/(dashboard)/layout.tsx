import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { prisma } from "@/lib/db";

export const metadata = { title: "Administración", robots: { index: false } };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  // Sin caché: visible desde cualquier vista del panel, no solo /admin/consultas.
  const unread = await prisma.inquiry.count({ where: { readAt: null } });

  return (
    <div className="min-h-dvh bg-[color:var(--color-canvas)]">
      <header className="border-b border-[color:var(--color-canvas-dim)]">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <Link href="/admin" className="font-semibold">
            Obras
          </Link>
          <Link href="/admin/artista">Ficha de artista</Link>
          <Link href="/admin/consultas" className="flex items-center gap-2">
            Consultas
            {unread > 0 ? (
              <span
                aria-label={`${unread} consultas sin leer`}
                className="rounded-full bg-[color:var(--color-oil)] px-2 py-0.5 text-xs text-[color:var(--color-canvas)] tabular"
              >
                {unread}
              </span>
            ) : null}
          </Link>
          <Link href="/galeria" className="text-[color:var(--color-ink-soft)]">
            Ver la web
          </Link>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
