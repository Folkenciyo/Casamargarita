import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen final mínima: solo .next/standalone + static + public.
  output: "standalone",
  // Las variantes (avif/webp 400/800/1600) se generan al subir con sharp,
  // no en cada request. El optimizador de Next sobra.
  images: { unoptimized: true },
  // sharp y argon2 son binarios nativos: fuera del bundle del server.
  serverExternalPackages: ["sharp", "@node-rs/argon2"],
  // El engine de Prisma es un .node que el tracing no descubre solo.
  outputFileTracingIncludes: {
    "/**/*": ["./lib/generated/prisma/**/*"],
  },
};

export default nextConfig;
