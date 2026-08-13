import Link from "next/link";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { createSeries } from "@/lib/admin/series-actions";

export const metadata = { title: "Nueva serie" };

export default function NuevaSeriePage() {
  return (
    <>
      <Link href="/admin/series" className="text-sm underline">
        ← Series
      </Link>
      <h1 className="display mt-2 mb-6 text-2xl">Nueva serie</h1>

      <SeriesForm action={createSeries} etiqueta="Crear serie" />
    </>
  );
}
