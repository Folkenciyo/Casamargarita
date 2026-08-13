import { prisma } from "@/lib/db";
import { log } from "@/lib/log";

/** Día natural en UTC, sin hora: la clave del contador. */
export function diaDe(fecha: Date): Date {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
}

/**
 * Suma una visita a la ficha de una obra.
 *
 * No se espera al resultado desde la página: contar visitas no puede retrasar
 * ni tumbar la ficha que el visitante ha venido a ver. Si el contador falla,
 * queda en el registro y se sigue.
 */
export function contarVisita(paintingId: string): void {
  const day = diaDe(new Date());

  prisma.paintingView
    .upsert({
      where: { paintingId_day: { paintingId, day } },
      create: { paintingId, day, count: 1 },
      update: { count: { increment: 1 } },
    })
    .catch((error: unknown) => {
      log.error("no se pudo contar la visita", error, { paintingId });
    });
}

export type ObraMirada = {
  id: string;
  title: string;
  visitas: number;
  consultas: number;
};

/**
 * Las obras más vistas de los últimos días, con las consultas que han
 * generado.
 *
 * Lo interesante no es el ranking: es la obra muy mirada y poco preguntada,
 * que suele significar que algo de su ficha —precio, fotos, medidas— está
 * frenando a quien se lo estaba pensando.
 */
export async function obrasMasMiradas(
  dias = 30,
  limite = 5,
): Promise<ObraMirada[]> {
  const desde = diaDe(new Date(Date.now() - dias * 24 * 60 * 60 * 1000));

  const agrupadas = await prisma.paintingView.groupBy({
    by: ["paintingId"],
    where: { day: { gte: desde } },
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: limite,
  });

  if (agrupadas.length === 0) return [];

  const obras = await prisma.painting.findMany({
    where: {
      id: { in: agrupadas.map((fila) => fila.paintingId) },
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      _count: { select: { inquiries: true } },
    },
  });

  const porId = new Map(obras.map((obra) => [obra.id, obra]));

  return agrupadas
    .map((fila) => {
      const obra = porId.get(fila.paintingId);
      if (!obra) return null;
      return {
        id: obra.id,
        title: obra.title,
        visitas: fila._sum.count ?? 0,
        consultas: obra._count.inquiries,
      };
    })
    .filter((obra): obra is ObraMirada => obra !== null);
}
