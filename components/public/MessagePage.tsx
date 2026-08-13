import Link from "next/link";

/**
 * Pantalla de recado: 404 y error usan la misma pieza para que un tropiezo
 * siga pareciendo parte de la casa y no la pantalla en blanco de Next.
 */
export function MessagePage({
  code,
  title,
  children,
  action,
}: {
  code: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-start py-24">
      <p className="tabular text-sm tracking-[0.3em] text-[color:var(--color-ink-soft)] uppercase">
        {code}
      </p>
      <h1 className="display mt-4 text-[length:var(--text-title)] text-balance">
        {title}
      </h1>
      <div className="lead mt-4">{children}</div>

      <div className="mt-10 flex flex-wrap items-center gap-6">
        {action}
        <Link
          href="/galeria"
          className="border-b border-[color:var(--color-oil)] pb-1 text-[color:var(--color-oil)] transition-colors hover:border-[color:var(--color-ink)] hover:text-[color:var(--color-ink)]"
        >
          Ir a la galería
        </Link>
        <Link href="/" className="text-sm underline">
          Volver a la portada
        </Link>
      </div>
    </section>
  );
}
