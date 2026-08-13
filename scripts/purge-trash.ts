/**
 * Vacía la papelera: borra de verdad las obras que llevan más de N días
 * marcadas, y con ellas sus fotos del disco.
 *
 * Lo ejecuta a diario el servicio `purge` de docker-compose.prod.yml. También
 * se puede lanzar a mano:
 *   docker compose exec web pnpm purge-trash
 *   docker compose exec web pnpm purge-trash -- --dias 7 --simular
 */
import { DIAS_EN_PAPELERA } from "../lib/admin/trash.ts";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { deleteUploads, uploadsDir } from "../lib/images/pipeline.ts";
import { log } from "../lib/log.ts";

const DIAS_POR_DEFECTO = DIAS_EN_PAPELERA;

function argumento(nombre: string): string | undefined {
  const indice = process.argv.indexOf(`--${nombre}`);
  return indice === -1 ? undefined : process.argv[indice + 1];
}

async function main(): Promise<void> {
  const dias = Number(argumento("dias") ?? DIAS_POR_DEFECTO);
  const simular = process.argv.includes("--simular");

  if (!Number.isFinite(dias) || dias < 0) {
    log.error("purga: --dias tiene que ser un número de días", null, { dias });
    process.exitCode = 1;
    return;
  }

  const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const prisma = new PrismaClient();

  try {
    const caducadas = await prisma.painting.findMany({
      where: { deletedAt: { not: null, lt: limite } },
      select: { id: true, title: true, slug: true, deletedAt: true },
    });

    if (caducadas.length === 0) {
      log.info("purga: nada que borrar", { dias });
      return;
    }

    if (simular) {
      log.info("purga: simulación, no se borra nada", {
        dias,
        obras: caducadas.map((obra) => obra.slug),
      });
      return;
    }

    for (const obra of caducadas) {
      // Primero la fila y después los ficheros: si el borrado de ficheros
      // fallara, quedan huérfanos en disco (recuperables a mano) en vez de
      // una obra sin fotos en la base de datos.
      await prisma.painting.delete({ where: { id: obra.id } });
      await deleteUploads(uploadsDir(), `paintings/${obra.id}`);

      log.info("purga: obra borrada definitivamente", {
        slug: obra.slug,
        titulo: obra.title,
        enPapeleraDesde: obra.deletedAt?.toISOString(),
      });
    }

    log.info("purga terminada", { borradas: caducadas.length, dias });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  log.error("purga: fallo inesperado", error);
  process.exitCode = 1;
});
