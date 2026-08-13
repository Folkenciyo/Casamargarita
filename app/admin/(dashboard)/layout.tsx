import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { AdminNav } from "@/components/admin/AdminNav";
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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-6 px-6 py-4">
          <AdminNav unread={unread} />
          <div className="ml-auto flex items-center gap-6">
            <Link
              href="/galeria"
              className="text-sm text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
            >
              Ver la web
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
