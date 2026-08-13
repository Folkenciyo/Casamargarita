import { prisma } from "@/lib/db";
import { log } from "@/lib/log";

// Readiness: comprueba que la base de datos responde. Separado de /api/health
// a propósito — el HEALTHCHECK del contenedor no debe reiniciar la app porque
// Postgres esté caído.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ready", db: "up" });
  } catch (error) {
    log.error("readiness: fallo de conexión a la base de datos", error);
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
