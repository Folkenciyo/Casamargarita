// Healthcheck del contenedor (HEALTHCHECK del Dockerfile y Dokploy).
// Sin dependencias: responde aunque Postgres esté caído, para poder
// distinguir "app muerta" de "base de datos caída".
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", uptime: process.uptime() });
}
