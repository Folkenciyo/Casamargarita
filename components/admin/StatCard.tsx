import Link from "next/link";

/**
 * Cifra del panel. La misma pieza sirve enlazada o suelta: si lleva `href`
 * el número entero es el enlace, que es lo que la mano busca.
 */
export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "plain",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "plain" | "accent" | "warn";
}) {
  const valueTone =
    tone === "accent"
      ? "text-[color:var(--color-oil)]"
      : tone === "warn"
        ? "text-amber-700"
        : "text-[color:var(--color-ink)]";

  const body = (
    <>
      <span className="text-sm text-[color:var(--color-ink-soft)]">{label}</span>
      <span className={`display tabular mt-1 block text-4xl ${valueTone}`}>
        {value}
      </span>
      {hint ? (
        <span className="mt-1 block text-xs text-[color:var(--color-ink-soft)]">
          {hint}
        </span>
      ) : null}
    </>
  );

  const className =
    "block rounded border border-[color:var(--color-canvas-dim)] bg-white p-4";

  return href ? (
    <Link
      href={href}
      className={`${className} transition-colors hover:border-[color:var(--color-oil)]`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
