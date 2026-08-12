import type { MetadataRoute } from "next";

const base = process.env.PUBLIC_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El panel y las variantes de imagen no aportan nada a un buscador.
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
