import { PrismaClient } from "@/lib/generated/prisma/client";

// Singleton: en desarrollo el hot reload recrearía un cliente por recarga
// y agotaría el pool de conexiones.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
