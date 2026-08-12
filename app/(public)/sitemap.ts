import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const base = process.env.PUBLIC_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paintings = await prisma.painting.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  });

  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/galeria`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/artista`, changeFrequency: "yearly", priority: 0.5 },
    ...paintings.map((painting) => ({
      url: `${base}/obra/${painting.slug}`,
      lastModified: painting.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
