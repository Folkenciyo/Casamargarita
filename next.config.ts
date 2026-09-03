import type { NextConfig } from "next";
import { UPLOAD_BODY_LIMIT_BYTES } from "./lib/images/limits";

const nextConfig: NextConfig = {
  // Sin esto, Next corta el cuerpo de toda Server Action a 1 MB y ninguna foto
  // de cámara llega al pipeline: se cae con un 413 antes de tocar servidor.
  // El tope real de una imagen lo pone el propio pipeline, que sí sabe decir
  // qué ha pasado.
  experimental: { serverActions: { bodySizeLimit: UPLOAD_BODY_LIMIT_BYTES } },
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
