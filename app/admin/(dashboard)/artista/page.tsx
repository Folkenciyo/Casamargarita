import { ArtistForm } from "@/components/admin/ArtistForm";
import { PortraitManager } from "@/components/admin/PortraitManager";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ficha de artista" };

export default async function AdminArtistPage() {
  const artist = await prisma.artist.findUnique({ where: { id: "singleton" } });

  return (
    <>
      <h1 className="mb-6 display text-2xl">
        Ficha de artista
      </h1>
      <ArtistForm
        values={{
          name: artist?.name ?? "",
          statement: artist?.statement ?? "",
          bio: artist?.bio ?? "",
          email: artist?.email ?? "",
          instagram: artist?.instagram ?? "",
          showSoldPaintings: artist?.showSoldPaintings ?? true,
        }}
      />

      <hr className="my-10 border-[color:var(--color-canvas-dim)]" />

      <PortraitManager
        portrait={
          artist?.portraitPath
            ? { path: artist.portraitPath, widths: artist.portraitWidths }
            : null
        }
      />
    </>
  );
}
