import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as {
  tipPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.tipPrisma ??
  new PrismaClient({
    log: ["error", "warn"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.tipPrisma = prisma;
}
