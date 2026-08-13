import { PrismaClient } from "../lib/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.artist.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "Casa Margarita",
      statement: "Óleo sobre lienzo. La materia antes que el motivo.",
      bio: "Biografía pendiente de redactar desde el panel de administración.",
    },
  });

  const demo = [
    {
      slug: "luz-de-tarde",
      title: "Luz de tarde",
      year: 2024,
      widthCm: 100,
      heightCm: 81,
      priceCents: 120000,
      description: "Estudio de luz rasante sobre paisaje abierto.",
      featured: true,
      position: 0,
    },
    {
      slug: "retrato-en-ocres",
      title: "Retrato en ocres",
      year: 2023,
      widthCm: 65,
      heightCm: 54,
      priceCents: 85000,
      description: "Retrato de estudio trabajado en capas finas.",
      position: 1,
    },
  ];

  for (const painting of demo) {
    await prisma.painting.upsert({
      where: { slug: painting.slug },
      update: {},
      create: painting,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
