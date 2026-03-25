import { PrismaClient } from "../../../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// La conexión a PostgreSQL se gestiona mediante el driver adapter de Prisma 7.
// La URL se lee de la variable de entorno DATABASE_URL.

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// Singleton compatible con el hot-reload de Next.js en desarrollo.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
