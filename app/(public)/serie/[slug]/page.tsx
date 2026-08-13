import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PaintingCard } from "@/components/public/PaintingCard";
import { seriePublica } from "@/lib/public/queries";
import { ajustesPublicos } from "@/lib/settings";

export const dynamic = "force-dynamic";

const getSerie = cache(async (slug: string) => {
  const { showSoldPaintings } = await ajustesPublicos();
  return seriePublica(slug, showSoldPaintings);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resultado = await getSerie((await params).slug);
  if (!resultado) return { title: "Serie no encontrada" };

  return {
    title: resultado.serie.title,
    description:
      resultado.serie.description ||
      `Serie de ${resultado.paintings.length} obras al óleo.`,
    openGraph: { type: "article", title: resultado.serie.title },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resultado = await getSerie((await params).slug);
  if (!resultado) notFound();

  const { serie, paintings } = resultado;

  return (
    <>
      <header className="mb-12 max-w-3xl">
        <p className="tabular text-xs tracking-[0.25em] text-[color:var(--color-ink-soft)] uppercase">
          Serie
        </p>
        <h1 className="display mt-3 text-[length:var(--text-title)] text-balance">
          {serie.title}
        </h1>
        {serie.description ? (
          <p className="lead mt-6 whitespace-pre-line">{serie.description}</p>
        ) : null}
        <p className="tabular mt-6 text-sm text-[color:var(--color-ink-soft)]">
          {paintings.length === 1 ? "1 obra" : `${paintings.length} obras`}
        </p>
      </header>

      {paintings.length === 0 ? (
        <p className="text-[color:var(--color-ink-soft)]">
          Esta serie todavía no tiene obra publicada.{" "}
          <Link href="/galeria" className="underline">
            Ver la galería completa
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {paintings.map((painting, index) => (
            <PaintingCard
              key={painting.id}
              painting={painting}
              priority={index < 3}
            />
          ))}
        </div>
      )}

      <p className="mt-16">
        <Link href="/galeria" className="text-sm underline">
          ← Toda la galería
        </Link>
      </p>
    </>
  );
}
